import pandas as pd

df = pd.read_csv("player_stats.csv")

# Filter for Hawthorn players
players = df[df["Team"] == "Geelong"]

# Select only the columns you care about
player_stats = players[[
    "Player", "Disposals", "Kicks", "Handballs", "TotalClearances", "Marks"
]].copy()

# Add ratio columns (decimal form)
player_stats["%K"] = player_stats["Kicks"] / player_stats["Disposals"]
player_stats["%H"] = player_stats["Handballs"] / player_stats["Disposals"]

print(player_stats)
