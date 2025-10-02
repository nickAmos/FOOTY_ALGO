from team_corr_heatmap import build_heatmap

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
for team in teams:
    build_heatmap(team, "Disposals", method="spearman", mask_lower=True)



