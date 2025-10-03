import pandas as pd
from pathlib import Path

# change as needed
min_tog = 60
teams = [
    "Western Bulldogs","Geelong","Greater Western Sydney","Gold Coast","Hawthorn",
    "Brisbane","Collingwood","Adelaide","Fremantle","Carlton","Melbourne","Sydney",
    "St Kilda","North Melbourne","Essendon","Port Adelaide","Richmond","West Coast"
]

FINAL_COLS = [
    "Round", "Player", "Team","Position",
    "Disposals", "Kicks", "Handballs", "K%", "H%",
    "Marks", "Goals", "Tackles",
    "DispDiff", "KickDiff", "HbDiff", "MarkDiff"
]

def clean_team_stats(team_name: str, min_tog: float, player_info: pd.DataFrame):
    base = Path(__file__).resolve().parent.parent
    team_dir = base / "data" / f"{team_name}_R1-24"
    src_csv = team_dir / f"{team_name.lower()}_stats.csv"
    if not src_csv.exists():
        raise FileNotFoundError(f"{src_csv} not found")

    df = pd.read_csv(src_csv)

    # ensure numeric types
    for col in ["Round", "TimeOnGround", "Disposals", "Kicks", "Handballs",
                "Marks", "Goals", "Tackles"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    before = len(df)

    # mask rows with low TOG
    mask = df["TimeOnGround"] < min_tog
    stat_cols = ["Disposals", "Kicks", "Handballs", "Marks", "Goals", "Tackles"]
    df.loc[mask, stat_cols] = pd.NA

    after = len(df)

    # ratios
    df["K%"] = round(df["Kicks"] / df["Disposals"], 2)
    df["H%"] = round(df["Handballs"] / df["Disposals"], 2)

    # ---- merge in averages from player_stats.csv ----
    avg_cols = ["Disposals", "Kicks", "Handballs", "Marks"]
    rename_map = {c: f"Avg_{c}" for c in avg_cols}
    player_info_sel = player_info[["Player"] + avg_cols].rename(columns=rename_map)
    df = df.merge(player_info_sel, on="Player", how="left")

    # ---- calculate differentials ----
    df["DispDiff"] = round(df["Disposals"] - df["Avg_Disposals"], 2)
    df["KickDiff"] = round(df["Kicks"] - df["Avg_Kicks"], 2)
    df["HbDiff"]   = round(df["Handballs"] - df["Avg_Handballs"], 2)
    df["MarkDiff"] = round(df["Marks"] - df["Avg_Marks"], 2)

    # sort
    df = df.sort_values(["Round", "Player"], kind="mergesort").reset_index(drop=True)

    # keep only final cols
    keep = [c for c in FINAL_COLS if c in df.columns]
    df = df[keep]

    # save
    out_csv = team_dir / f"{team_name.lower()}_stats_clean.csv"
    df.to_csv(out_csv, index=False)

    print(f"✅ Cleaned CSV written: {out_csv}")
    print(f"Filtered out {before - after} low-TOG rows (< {min_tog}). Kept {after}.")

if __name__ == "__main__":
    base = Path(__file__).resolve().parent.parent
    player_info = pd.read_csv(base / "player_stats.csv")  # load once
    for team in teams:
        clean_team_stats(team, min_tog, player_info)
