import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "../styling/PlotPlayers.css";

const STAT_TO_COLUMN = {
  DispDiff: "Disposals",
  KickDiff: "Kicks",
  HbDiff: "Handballs",
  MarkDiff: "Marks",
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

function formatValueWithDiff(record, valueColumn, diffColumn) {
  const base = formatValue(record, valueColumn);
  if (base === "—") return base;
  if (!record || !diffColumn) return base;
  const diffRaw = record[diffColumn];
  if (diffRaw === undefined || diffRaw === null || diffRaw === "") return base;
  const diffNum = Number(diffRaw);
  let diff;
  if (Number.isFinite(diffNum)) {
    diff = Number.isInteger(diffNum) ? diffNum.toString() : diffNum.toFixed(2);
  } else if (typeof diffRaw === "string" && diffRaw.trim()) {
    diff = diffRaw.trim();
  } else {
    return base;
  }
  return `${base} (${diff})`;
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
    <div className="player-container">
      <div className="player-header">
        <h3>Player Rounds</h3>
        {onBack && (
          <button onClick={onBack} className="player-back-button">
            Back to heatmap
          </button>
        )}
      </div>

      <div className="player-meta">
        {rowPlayer} × {colPlayer} | Team: {normaliseTeamName(team)}
      </div>

      {loading && <div>Loading round data…</div>}
      {error && <div className="player-alert">{error}</div>}

      {!loading && !error && (!playerRows || rounds.length === 0) && (
        <div>No round data found for the selected players.</div>
      )}

      {!loading && !error && playerRows && rounds.length > 0 && (
        <div className="player-sections">
          {statsToDisplay.map(({ stat, column }) => {
            const diffColumn = stat !== column ? stat : null;
            return (
              <div key={column}>
                <h4 className="player-section-title">
                  {column}
                  {column !== stat ? ` (from ${stat})` : ""}
                </h4>
                <table className="player-table">
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>{rowPlayer}</th>
                      <th>{colPlayer}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((round) => {
                      const rowEntry = playerRows[rowPlayer]?.find((r) => r.Round === round);
                      const colEntry = playerRows[colPlayer]?.find((r) => r.Round === round);
                      return (
                        <tr key={`${column}-${round}`}>
                          <td>{round}</td>
                          <td>{formatValueWithDiff(rowEntry, column, diffColumn)}</td>
                          <td>{formatValueWithDiff(colEntry, column, diffColumn)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
