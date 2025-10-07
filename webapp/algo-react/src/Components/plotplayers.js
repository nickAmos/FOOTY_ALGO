import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

const STAT_TO_COLUMN = {
  DispDiff: "Disposals",
  KickDiff: "Kicks",
  HbDiff: "Handballs",
  MarkDiff: "Marks",
};

const PLAYER_CONTAINER_STYLE = {
  padding: 24,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#f9fafb",
};

const TABLE_STYLE = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const HEADER_CELL_STYLE = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #d1d5db",
  background: "#eef2ff",
};

const CELL_STYLE = {
  padding: "6px 8px",
  borderBottom: "1px solid #e5e7eb",
};

function statToColumn(stat) {
  return STAT_TO_COLUMN[stat] || stat;
}

function formatValue(record, column) {
  if (!record) return "—";
  const raw = record[column];
  if (raw === undefined || raw === null || raw === "") return "—";
  const num = Number(raw);
  if (Number.isFinite(num)) {
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  }
  return raw;
}

function normaliseTeamName(team) {
  return team.replace(/-/g, " ");
}

function buildCsvUrl(team) {
  const teamWithSpaces = normaliseTeamName(team);
  const folder = `${teamWithSpaces}_R1-24`;
  const filename = `${teamWithSpaces.toLowerCase()}_stats_clean.csv`;
  const base = process.env.PUBLIC_URL || "";
  const encodedFolder = encodeURIComponent(folder);
  const encodedFile = encodeURIComponent(filename);
  return `${base}/player-round-stats/${encodedFolder}/${encodedFile}`;
}

export default function PlotPlayers({ rowPlayer, colPlayer, team, stat1, stat2, onBack }) {
  const [playerRows, setPlayerRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPlayerRows(null);

    const url = buildCsvUrl(team);
    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load ${url}`);
        }
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const nextRows = { [rowPlayer]: [], [colPlayer]: [] };
        Papa.parse(text, {
          header: true,
          dynamicTyping: false,
          skipEmptyLines: true,
          complete: ({ data }) => {
            data.forEach((row) => {
              if (!row || !row.Player) return;
              if (row.Player !== rowPlayer && row.Player !== colPlayer) return;
              const round = Number(row.Round);
              if (!Number.isFinite(round)) return;
              nextRows[row.Player].push({ ...row, Round: round });
            });

            Object.values(nextRows).forEach((list) => list.sort((a, b) => a.Round - b.Round));
            setPlayerRows(nextRows);
            setLoading(false);
          },
          error: (err) => {
            setError(err.message || "Unable to parse player data");
            setLoading(false);
          },
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load player data");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rowPlayer, colPlayer, team]);

  const rounds = useMemo(() => {
    if (!playerRows) return [];
    const set = new Set();
    [rowPlayer, colPlayer].forEach((p) => {
      playerRows[p]?.forEach((row) => {
        set.add(row.Round);
      });
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [playerRows, rowPlayer, colPlayer]);

  const statsToDisplay = useMemo(() => {
    const order = [];
    const seen = new Set();
    [stat1, stat2].forEach((stat) => {
      if (!stat) return;
      const column = statToColumn(stat);
      if (seen.has(column)) return;
      seen.add(column);
      order.push({ stat, column });
    });
    return order;
  }, [stat1, stat2]);

  return (
    <div style={PLAYER_CONTAINER_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Player Rounds</h3>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
            }}
          >
            Back to heatmap
          </button>
        )}
      </div>

      <div style={{ marginBottom: 10, color: "#4b5563", fontSize: 14 }}>
        {rowPlayer} × {colPlayer} | Team: {normaliseTeamName(team)}
      </div>

      {loading && <div>Loading round data…</div>}
      {error && <div style={{ color: "#b91c1c" }}>{error}</div>}

      {!loading && !error && (!playerRows || rounds.length === 0) && (
        <div>No round data found for the selected players.</div>
      )}

      {!loading && !error && playerRows && rounds.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {statsToDisplay.map(({ stat, column }) => (
            <div key={column}>
              <h4 style={{ margin: "0 0 8px" }}>
                {column}
                {column !== stat ? ` (from ${stat})` : ""}
              </h4>
              <table style={TABLE_STYLE}>
                <thead>
                  <tr>
                    <th style={HEADER_CELL_STYLE}>Round</th>
                    <th style={HEADER_CELL_STYLE}>{rowPlayer}</th>
                    <th style={HEADER_CELL_STYLE}>{colPlayer}</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((round) => {
                    const rowEntry = playerRows[rowPlayer]?.find((r) => r.Round === round);
                    const colEntry = playerRows[colPlayer]?.find((r) => r.Round === round);
                    return (
                      <tr key={`${column}-${round}`}>
                        <td style={CELL_STYLE}>{round}</td>
                        <td style={CELL_STYLE}>{formatValue(rowEntry, column)}</td>
                        <td style={CELL_STYLE}>{formatValue(colEntry, column)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
