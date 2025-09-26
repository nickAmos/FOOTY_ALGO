import pandas as pd
from pathlib import Path

# 👇 Change this to whichever team you want to build
team = "Geelong"

def build_team_stats(team_name: str):
    """
    Build a tidy long table of one team's stats across all rounds,
    and save it into a team-specific folder inside /data.
    """
    # Base project directory (parent of /scripts)
    base_dir = Path(__file__).resolve().parent.parent

    # Input folder with R1.csv ... R24.csv
    rounds_dir = base_dir / "Stats_by_round"

    # Output folder: e.g. data/Hawthorn_R1-24
    output_dir = base_dir / "data" / f"{team_name}_R1-24"
    output_dir.mkdir(parents=True, exist_ok=True)

    all_rounds = []

    # Loop through R1.csv ... R24.csv
    for file in sorted(rounds_dir.glob("R*.csv")):
        round_num = int(file.stem[1:])  # "R12" -> 12
        df = pd.read_csv(file)
        df.columns = df.columns.str.strip()

        # Filter for the team
        team_df = df[df["Team"] == team_name].copy()
        team_df["Round"] = round_num

        all_rounds.append(team_df)

    # Combine all rounds
    tidy_df = pd.concat(all_rounds, ignore_index=True)

    # Put Round, Player, Team first
    cols = ["Round", "Player", "Team"] + [c for c in tidy_df.columns if c not in ["Round", "Player", "Team"]]
    tidy_df = tidy_df[cols]

    # Save as CSV inside team folder
    output_file = output_dir / f"{team_name.lower()}_stats.csv"
    tidy_df.to_csv(output_file, index=False)

    print(f"✅ Saved {len(tidy_df)} rows for {team_name} to {output_file}")

if __name__ == "__main__":
    build_team_stats(team)
