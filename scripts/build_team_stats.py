import pandas as pd
from pathlib import Path

teams = [
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

def build_team_stats(team_name: str, player_info: pd.DataFrame):
    """
    Build a tidy long table of one team's stats across all rounds,
    join in Position info from player_stats.csv,
    and save it into a team-specific folder inside /data.
    """
    base_dir = Path(__file__).resolve().parent.parent
    rounds_dir = base_dir / "Stats_by_round"
    output_dir = base_dir / "data" / f"{team_name}_R1-24"
    output_dir.mkdir(parents=True, exist_ok=True)

    all_rounds = []

    for file in sorted(rounds_dir.glob("R*.csv")):
        round_num = int(file.stem[1:])  # "R12" -> 12
        df = pd.read_csv(file)
        df.columns = df.columns.str.strip()

        # Filter for the team
        team_df = df[df["Team"] == team_name].copy()
        team_df["Round"] = round_num

        all_rounds.append(team_df)

    tidy_df = pd.concat(all_rounds, ignore_index=True)

    # 👉 Merge in Position info based on Player name
    tidy_df = tidy_df.merge(
        player_info[["Player", "Position"]],
        on="Player",
        how="left"
    )

    # Put Round, Player, Team, Position first
    cols = ["Round", "Player", "Team", "Position"] + [
        c for c in tidy_df.columns if c not in ["Round", "Player", "Team", "Position"]
    ]
    tidy_df = tidy_df[cols]

    output_file = output_dir / f"{team_name.lower()}_stats.csv"
    tidy_df.to_csv(output_file, index=False)
    print(f"✅ Saved {len(tidy_df)} rows for {team_name} to {output_file}")

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    # Load master player info file
    player_info = pd.read_csv(base_dir / "player_stats.csv")

    for team in teams:
        build_team_stats(team, player_info)
