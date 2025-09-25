from sportsbet_scape import scrape_player_disposals

URL = "https://www.sportsbet.com.au/betting/australian-rules/afl/geelong-cats-v-brisbane-lions-9638368"
PLAYER = "Bailey Smith"

if __name__ == "__main__":
    markets = scrape_player_disposals(URL, PLAYER, headless=False)
    print(f"{PLAYER} disposals markets:")
    for m in markets:
        print(f" - {m['line']}: {m['odds']}")