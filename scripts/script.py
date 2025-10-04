from team_corr_heatmap import build_heatmap
from pathlib import Path





"""
Build heatMAPS:"""
stats = [
    "DispDiff","KickDiff","HbDiff","MarkDiff",
]

teams = [
    "Western Bulldogs","Geelong","Greater Western Sydney","Gold Coast","Hawthorn",
    "Brisbane","Collingwood","Adelaide","Fremantle","Carlton",
    "Melbourne","Sydney","St Kilda","North Melbourne","Essendon",
    "Port Adelaide","Richmond","West Coast"
]

for t in teams:
    for i, stat1 in enumerate(stats):
        for j, stat2 in enumerate(stats):
            if j < i:  # skip lower half, avoids duplicates
                continue
            triangle = (stat1 == stat2)
            print(f"Building {stat1} vs {stat2} for {t}...")
            build_heatmap(t, stat1, stat2, mask_lower=triangle)
            print("✅")