import pandas as pd
from pathlib import Path

   # change as needed
min_tog = 60         # threshold
teams =[
    "Western Bulldogs",
    "Geelong",
    "Greater Western Sydney",
    "Gold Coast",
    "Hawthorn",
    "Brisbane",
    "Collingwood",
    "Adelaide",
    "Fremantle",
    "Carlton",
    "Melbourne",
    "Sydney",
    "St Kilda",
    "North Melbourne",
    "Essendon",
    "Port Adelaide",
    "Richmond",
    "West Coast"
]

FINAL_COLS = [
    "Round", "Player", "Team",
    "Disposals", "Kicks", "Handballs", "K%", "H%",
    "Marks", "Goals", "Tackles", "Position"
]

def clean_team_stats(team_name: str, min_tog: float):
    base = Path(__file__).resolve().parent.parent
    team_dir = base / "data" / f"{team_name}_R1-24"
    src_csv = team_dir / f"{team_name.lower()}_stats.csv"
    if not src_csv.exists():
        raise FileNotFoundError(f"{src_csv} not found")

    df = pd.read_csv(src_csv)

    # Ensure numeric types
    for col in ["Round", "TimeOnGround", "Disposals", "Kicks", "Handballs",
                "Marks", "Goals", "Tackles"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    before = len(df)

    # Mask rows with low TOG
    mask = df["TimeOnGround"] < min_tog

    # Null out the key stat columns for those rows
    stat_cols = ["Disposals", "Kicks", "Handballs", "Marks", "Goals", "Tackles"]
    df.loc[mask, stat_cols] = pd.NA

    after = len(df)  # row count unchanged


    # Ratios (decimals, not percentages)
    df["K%"] = round(df["Kicks"] / df["Disposals"], 2)
    df["H%"] = round(df["Handballs"] / df["Disposals"], 2)

    # Sort by round (numeric), then player
    df = df.sort_values(["Round", "Player"], kind="mergesort").reset_index(drop=True)

    # Keep only the final columns (subset if some missing)
    keep = [c for c in FINAL_COLS if c in df.columns]
    df = df[keep]

    # Save to CSV
    out_csv = team_dir / f"{team_name.lower()}_stats_clean.csv"
    df.to_csv(out_csv, index=False)

    print(f"✅ Cleaned CSV written: {out_csv}")
    print(f"Filtered out {before - after} low-TOG rows (< {min_tog}). Kept {after}.")

if __name__ == "__main__":
    for team in teams:
        clean_team_stats(team, min_tog)
