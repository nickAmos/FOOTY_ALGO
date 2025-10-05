from pathlib import Path
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import unicodedata

POSITION_ORDER = [
    "Key Forward",
    "Gen. Forward",
    "Mid-Forward",
    "Midfielder",
    "Ruck",
    "Gen. Defender",
    "Key Defender",
]

def _normalize_strings(s: pd.Series) -> pd.Series:
    return (s.astype(str)
              .map(lambda x: unicodedata.normalize("NFKC", x))
              .str.replace(r"\s+", " ", regex=True)
              .str.strip())

def _slugify_team_name(team: str) -> str:
    normalized = unicodedata.normalize("NFKC", str(team)).strip()
    return "-".join(normalized.split())

def _order_players_by_position(df: pd.DataFrame, players: list[str]) -> list[str]:
    pos_idx = {p: i for i, p in enumerate(POSITION_ORDER)}
    pos_map = (df[df["Player"].isin(players)]
               .groupby("Player")["Position"]
               .agg(lambda s: s.dropna().iloc[0] if s.dropna().size else None)
               .to_dict())
    return sorted(players, key=lambda p: (pos_idx.get(pos_map.get(p), len(POSITION_ORDER)), p.lower()))

def build_heatmap(
    team: str,
    stat1: str,
    stat2: str,
    min_games_stat1: int = 12,
    min_games_stat2: int = 12,
    method: str = "pearson",
    mask_lower: bool = False,
    figsize: tuple[int, int] = (14, 12),
    annotate: bool = True,
    save_dir: str | Path = Path.home() / "Desktop" / "Results",  # ✅ Desktop/Results default
    return_df: bool = False,
):

    """
    Build a player-vs-player correlation heatmap for one team, comparing stat1 (rows) to stat2 (cols).

    Examples:
      build_heatmap("Hawthorn", "Disposals", "Disposals")
      build_heatmap("Hawthorn", "Disposals", "Kicks")

    Parameters
    ----------
    team : str
    stat1 : str   # series for row-players
    stat2 : str   # series for column-players
    min_games_stat1 : int  # drop row players with < this many non-null stat1 values
    min_games_stat2 : int  # drop col players with < this many non-null stat2 values
    method : {"pearson","spearman","kendall"}
    mask_lower : bool  # only used when stat1 == stat2 (square matrix)
    figsize : (w,h)
    annotate : bool    # write correlation numbers in cells
    save_dir : str|Path
    return_df : bool   # return the correlation DataFrame

    Saves
    -----
    PNG heatmap and CSV matrix to results/<Team>/.
    """
    base = Path(__file__).resolve().parent.parent
    csv_path = base / "data" / f"{team}_R1-24" / f"{team.lower()}_stats_clean.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"{csv_path} not found")

    df = pd.read_csv(csv_path)

    # validate
    required = {"Round", "Player", "Position", stat1, stat2}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in {csv_path}: {sorted(missing)}")

    # normalize names to avoid near-duplicate players
    df["Player"] = _normalize_strings(df["Player"])
    df["Position"] = _normalize_strings(df["Position"])

    # collapse accidental duplicate rows per (Round, Player, Position)
    agg_map = {}
    if stat1 == stat2:
        agg_map = {stat1: "sum"}
    else:
        agg_map = {stat1: "sum", stat2: "sum"}
    df = (df.groupby(["Round", "Player", "Position"], as_index=False)
            .agg(agg_map))

    # filter players separately by stat availability
    counts1 = df.groupby("Player")[stat1].apply(lambda s: s.notna().sum())
    counts2 = df.groupby("Player")[stat2].apply(lambda s: s.notna().sum())
    row_players = counts1[counts1 >= min_games_stat1].index.tolist()
    col_players = counts2[counts2 >= min_games_stat2].index.tolist()

    if len(row_players) < 1 or len(col_players) < 1:
        raise RuntimeError("Not enough players after filtering. "
                           "Lower min_games or check your CSV.")

    # pivot tables by round
    pivot1 = df.pivot_table(index="Round", columns="Player", values=stat1, aggfunc="sum")
    pivot2 = df.pivot_table(index="Round", columns="Player", values=stat2, aggfunc="sum")
    # ensure numeric
    pivot1 = pivot1.apply(pd.to_numeric, errors="coerce")
    pivot2 = pivot2.apply(pd.to_numeric, errors="coerce")

    # keep only requested players
    pivot1 = pivot1[[p for p in row_players if p in pivot1.columns]]
    pivot2 = pivot2[[p for p in col_players if p in pivot2.columns]]

    # order by position
    rows_ordered = _order_players_by_position(df, pivot1.columns.tolist())
    cols_ordered = _order_players_by_position(df, pivot2.columns.tolist())

    # compute cross-stat correlation matrix
    # corr[i,j] = corr(pivot1[i], pivot2[j]) over rounds where both are non-null
    corr = pd.DataFrame(index=rows_ordered, columns=cols_ordered, dtype=float)
    for r in rows_ordered:
        s1 = pivot1[r]
        for c in cols_ordered:
            s2 = pivot2[c]
            valid = s1.notna() & s2.notna()
            if valid.sum() >= 2:
                corr.loc[r, c] = s1[valid].corr(s2[valid], method=method)
            else:
                corr.loc[r, c] = np.nan

    # outputs
# Make Results/<Team>/<stat1>_vs_<stat2> folder
    team_slug = _slugify_team_name(team)
    out_dir = Path(save_dir) / team_slug / f"{stat1}_vs_{stat2}"
    out_dir.mkdir(parents=True, exist_ok=True)

    out_csv = out_dir / f"{team_slug.lower()}_{stat1}_vs_{stat2}_corr.csv"
    out_png = out_dir / f"{team_slug.lower()}_{stat1}_vs_{stat2}_corr.png"


    corr.to_csv(out_csv, float_format="%.3f")

    # plotting
    sns.set_context("talk")
    sns.set_style("white")

    # If same-stat square matrix: optional mask lower triangle
        # If same-stat (square matrix): mask lower triangle if requested
    
    plot_matrix = corr.copy()

    if stat1 == stat2:
        # Grey out diagonal
        np.fill_diagonal(plot_matrix.values, np.nan)

        # Mask lower triangle if requested
        heatmap_mask = None
        if mask_lower:
            heatmap_mask = np.zeros_like(plot_matrix, dtype=bool)
            tril = np.tril_indices_from(heatmap_mask, k=-1)
            heatmap_mask[tril] = True

        # Build annotations (leave diagonal blank)
        annot_data = plot_matrix.round(2).astype(object) if annotate else None
        if annot_data is not None:
            annot_data = annot_data.where(~annot_data.isna(), other="")

    else:
        # Cross-stat: no diagonal greying, no mask
        heatmap_mask = None
        annot_data = plot_matrix.round(2) if annotate else None


    # set cmap with grey for NaN
    cmap = sns.color_palette("RdBu_r", as_cmap=True)
    cmap.set_bad(color="lightgrey")

    plt.figure(figsize=figsize)
    ax = sns.heatmap(
        plot_matrix,
        cmap=cmap,
        vmin=-1, vmax=1, center=0,
        square=True if stat1 == stat2 else False,  # rectangular allowed for cross-stat
        mask=heatmap_mask,
        linewidths=0.5,
        linecolor="white",
        cbar_kws={"label": f"{method.capitalize()} correlation"},
        annot=annot_data is not None,
        fmt="",
        annot_kws={"size": 8},
        # If annot_data is provided, seaborn uses it when annot=True and data is 2D of same shape
    )
    if annot_data is not None:
        # Re-draw with provided labels (seaborn uses 'data' for heatmap,
        # but for annotations we can pass the array via 'ax.text' loop if needed.
        # However, seaborn supports ndarray as `annot` argument directly:
        plt.cla()
        ax = sns.heatmap(
            plot_matrix,
            cmap=cmap,
            vmin=-1, vmax=1, center=0,
            square=True if stat1 == stat2 else False,
            mask=heatmap_mask,
            linewidths=0.5,
            linecolor="white",
            cbar_kws={"label": f"{method.capitalize()} correlation"},
            annot=annot_data.values,
            fmt="",
            annot_kws={"size": 8},
        )

    title = f"{team}: {stat1} vs {stat2} ({method.capitalize()})"
    ax.set_title(title)
    ax.set_xticklabels(ax.get_xticklabels(), rotation=90, ha="center", fontsize=9)
    ax.set_yticklabels(ax.get_yticklabels(), rotation=0, fontsize=9)
    plt.tight_layout()
    plt.savefig(out_png, dpi=300, bbox_inches="tight")
    plt.close()

    


    print(f"✅ Heatmap: {out_png}")
    print(f"✅ Matrix : {out_csv}")

    return corr if return_df else None
