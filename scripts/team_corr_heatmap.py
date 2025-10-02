# team_corr_heatmap.py
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

def _order_players_by_position(df: pd.DataFrame, players: list[str]) -> list[str]:
    pos_idx = {p: i for i, p in enumerate(POSITION_ORDER)}
    pos_map = (df[df["Player"].isin(players)]
               .groupby("Player")["Position"]
               .agg(lambda s: s.dropna().iloc[0] if s.dropna().size else None)
               .to_dict())
    return sorted(players, key=lambda p: (pos_idx.get(pos_map.get(p), len(POSITION_ORDER)), p.lower()))

def build_heatmap(team: str,
                  stat: str,
                  min_games: int = 12,
                  method: str = "spearman",
                  mask_lower: bool = False,
                  save_dir: str | Path = "results",
                  return_df: bool = False):
    """
    Build a player×player correlation heatmap for a single stat within one team.

    Parameters
    ----------
    team : str            # e.g. "Hawthorn"
    stat : str            # e.g. "Disposals", "Kicks", "Marks"
    min_games : int       # drop players with < min_games non-null values of `stat`
    method : {"pearson","spearman"}
    mask_lower : bool     # if True, show only upper triangle
    save_dir : str|Path   # base output directory
    return_df : bool      # if True, return correlation DataFrame

    Saves
    -----
    PNG heatmap and CSV matrix to results/<Team>/.
    """
    base = Path(__file__).resolve().parent.parent
    csv_path = base / "data" / f"{team}_R1-24" / f"{team.lower()}_stats_clean.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"{csv_path} not found")

    df = pd.read_csv(csv_path)

    required = {"Round", "Player", "Position", stat}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)} in {csv_path}")

    # Normalise key strings to avoid duplicate-looking names
    df["Player"] = _normalize_strings(df["Player"])
    df["Position"] = _normalize_strings(df["Position"])

    # Collapse any accidental duplicate rows per (Round, Player, Position)
    df = (df.groupby(["Round", "Player", "Position"], as_index=False)
            .agg({stat: "sum"}))

    # Drop players with too few valid rounds for this stat
    counts = df.groupby("Player")[stat].apply(lambda s: s.notna().sum())
    keep_players = counts[counts >= min_games].index
    df = df[df["Player"].isin(keep_players)].copy()

    if df["Player"].nunique() < 2:
        raise RuntimeError("Not enough players after filtering (need ≥ 2).")

    # Pivot: rows=Round, cols=Player, values=stat
    pivot = df.pivot_table(index="Round", columns="Player", values=stat, aggfunc="sum")
    pivot = pivot.apply(pd.to_numeric, errors="coerce")

    # Drop players with no variance or all-NaN
    nunique = pivot.nunique(dropna=True)
    pivot = pivot.loc[:, nunique[nunique > 1].index]

    players = pivot.columns.tolist()
    if len(players) < 2:
        raise RuntimeError("After variance filtering, < 2 players remain.")

    # Order by Position (then name)
    ordered = _order_players_by_position(df, players)
    pivot = pivot[ordered]

    # Compute pairwise correlations (pairwise complete obs)
    corr = pivot.corr(method=method)
    corr = corr.loc[ordered, ordered]

    # Output paths
    out_dir = Path(save_dir) / team
    out_dir.mkdir(parents=True, exist_ok=True)
    out_csv = out_dir / f"{team.lower()}_{stat}_{method}.csv"
    out_png = out_dir / f"{team.lower()}_{stat}_{method}.png"

    # Save CSV
    corr.to_csv(out_csv, float_format="%.3f")

    # Plot
    sns.set_context("talk")
    sns.set_style("white")
    mask = None
    if mask_lower:
        mask = np.zeros_like(corr, dtype=bool)
        mask[np.tril_indices_from(mask)] = True

        # Replace diagonal with NaN so it greys out
    plot_corr = corr.copy()
    np.fill_diagonal(plot_corr.values, np.nan)

    # Colormap with grey for NaN
    cmap = sns.color_palette("RdBu_r", as_cmap=True)
    cmap.set_bad(color="lightgrey")

    plt.figure(figsize=(14, 12))  # adjust size as needed
    ax = sns.heatmap(
        plot_corr,
        cmap=cmap,
        vmin=-1, vmax=1, center=0,
        square=True,
        mask=mask,
        linewidths=0.5,
        linecolor="white",
        cbar_kws={"label": "Correlation"},
        annot=True, fmt=".2f", annot_kws={"size":8}
    )
    ax.set_title(f"{method.capitalize()} correlation: {stat} ({team})")
    ax.set_xticklabels(ax.get_xticklabels(), rotation=90, ha="center", fontsize=9)
    ax.set_yticklabels(ax.get_yticklabels(), rotation=0, fontsize=9)
    plt.tight_layout()
    plt.savefig(out_png, dpi=300, bbox_inches="tight")
    plt.close()


    print(f"✅ Heatmap: {out_png}")
    print(f"✅ Matrix : {out_csv}")

    return corr if return_df else None
