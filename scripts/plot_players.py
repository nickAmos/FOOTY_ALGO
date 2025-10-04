from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import unicodedata

def _norm(s: pd.Series) -> pd.Series:
    return (s.astype(str)
              .map(lambda x: unicodedata.normalize("NFKC", x))
              .str.replace(r"\s+", " ", regex=True)
              .str.strip())

def plot_player_duo_points(
    team: str,
    player_a: str,
    player_b: str,
    stat: str = "Disposals",                 # e.g. Disposals, DispDiff, K%, etc.
    figsize: tuple[int, int] = (12, 6),
    save_dir: Path | str = Path.home() / "Desktop" / "Results",
    show: bool = False,                      # True -> plt.show(); False -> just save
):
    """
    Plot per-round POINTS for two players from a single team's *_stats_clean.csv.
    No correlations, no lines — just points where data exists (missing rounds appear as gaps).

    Saves PNG to: Desktop/Results/<Team>/player_duo/
    Returns the output Path.
    """
    # Locate clean team CSV
    base = Path(__file__).resolve().parent.parent  # project root
    csv_path = base / "data" / f"{team}_R1-24" / f"{team.lower()}_stats_clean.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Could not find team clean CSV: {csv_path}")

    # Load + normalise names
    df = pd.read_csv(csv_path)
    if stat not in df.columns:
        raise ValueError(f"Stat '{stat}' not found in {csv_path}. Got: {sorted(df.columns)}")

    df["Player"] = _norm(df["Player"])
    player_a = unicodedata.normalize("NFKC", player_a).strip()
    player_b = unicodedata.normalize("NFKC", player_b).strip()

    # Pull each player's series (index by Round, sorted)
    keep = ["Round", "Player", stat]
    a = (df[keep][df["Player"] == player_a]
           .set_index("Round")[stat]
           .sort_index())
    b = (df[keep][df["Player"] == player_b]
           .set_index("Round")[stat]
           .sort_index())

    if a.empty:
        raise ValueError(f"Player not found (A): '{player_a}' in {team}")
    if b.empty:
        raise ValueError(f"Player not found (B): '{player_b}' in {team}")

    # Reindex to rounds 1..24 so missing games show as empty gaps
    rounds = np.arange(1, 25)
    a = a.reindex(rounds)
    b = b.reindex(rounds)

    # --- Plot (points only) ---
    plt.figure(figsize=figsize)
    ax = plt.gca()

    # scatter points for each player; missing values are skipped automatically
    ax.scatter(rounds[a.notna()], a[a.notna()], label=player_a, s=40)
    ax.scatter(rounds[b.notna()], b[b.notna()], label=player_b, s=40)

    ax.set_title(f"{team}: {player_a} vs {player_b} — {stat}")
    ax.set_xlabel("Round")
    ax.set_ylabel(stat)
    ax.set_xticks(rounds)
    ax.grid(True, linewidth=0.5, alpha=0.5)
    ax.legend()

    plt.tight_layout()

    # Save to Desktop/Results/<Team>/player_duo/
    out_dir = Path(save_dir) / team / "player_duo"
    out_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{team.lower()}_{stat.lower()}_{player_a.lower().replace(' ','-')}_vs_{player_b.lower().replace(' ','-')}.png"
    out_path = out_dir / fname
    plt.savefig(out_path, dpi=300, bbox_inches="tight")
    if show:
        plt.show()
    plt.close()

    print(f"✅ Saved plot → {out_path}")
    
    return out_path


plot_player_duo_points("Greater Western Sydney", "Jacob Wehr", "Joe Fonti", stat="DispDiff")

