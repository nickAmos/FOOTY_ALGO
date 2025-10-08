import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "../styling/Heatmap.css";

/** Convert hex to rgb for color mixing */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
/** Linear mix two colors */
function mix(hex1, hex2, t) {
  const a = hexToRgb(hex1), b = hexToRgb(hex2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bch = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bch})`;
}
/** Map correlation [-1..1] to color */
function corrToColor(v) {
  if (v === null || Number.isNaN(v)) return "#e4e7eb"; // light grey for NaN/blank
  const t = Math.max(-1, Math.min(1, v));
  // blue → white → re
  if (t < 0) return mix("#2b6cb0", "#ffffff", t + 1); // (-1..0) -> (0..1)
  return mix("#ffffff", "#c53030", t);                // (0..1)
}
function labelColor(v, isDiag) {
  if (isDiag) return "#333";
  if (v === null) return "#333";
  return Math.abs(v) > 0.6 ? "#fff" : "#111";
}

/** Parse correlation CSV: first row = col headers; first col = row headers */
function parseCorrCsv(text) {
  const parsed = Papa.parse(text.trim(), { skipEmptyLines: true });
  const rows = parsed.data;
  if (!rows.length || rows[0].length < 2) {
    throw new Error("CSV format not recognized");
  }
  const cols = rows[0].slice(1);
  const rowNames = [];
  const matrix = [];
  for (let i = 1; i < rows.length; i++) {
    const line = rows[i];
    rowNames.push(line[0]);
    const vals = line.slice(1).map((v) => {
      const t = (v ?? "").toString().trim();
      if (!t || t.toLowerCase() === "nan" || t === "NA") return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    });
    matrix.push(vals);
  }
  return { rows: rowNames, cols, matrix };
}

export default function Heatmap({
  csvUrl,
  cellSize = 28,
  showValues = true,
  onCellClick,
  title,
}) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(csvUrl)
      .then(async (res) => {
        const text = await res.text();
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || ct.includes("text/html")) {
          throw new Error(`Not a CSV at ${csvUrl}`);
        }
        return text;
      })
      .then((text) => {
        if (cancelled) return;
        setData(parseCorrCsv(text));
      })
      .catch((e) => setErr(e.message));
    return () => { cancelled = true; };
  }, [csvUrl]);

  const gridCols = useMemo(() => {
    if (!data) return "1fr";
    // left sticky column wide enough for names
    return `${Math.max(140, cellSize * 5)}px repeat(${data.cols.length}, ${cellSize}px)`;
  }, [data, cellSize]);

  const containerStyle = useMemo(
    () => ({
      "--hm-grid-columns": gridCols,
      "--hm-cell-size": `${cellSize}px`,
    }),
    [gridCols, cellSize],
  );

  if (err) return <div className="hm-message hm-message--error">Error: {err}</div>;
  if (!data) return <div className="hm-message">Loading heatmap…</div>;

  return (
    <div className="heatmap-container" style={containerStyle}>
      {title && <div className="heatmap-title">{title}</div>}

      {/* Header row */}
      <div className="hm-header">
        <div className="hm-header-label">Players</div>
        {data.cols.map((c, j) => (
          <div
            key={`h-${j}`}
            title={c}
            className="hm-header-cell"
          >
            {c}
          </div>
        ))}
      </div>

      {/* Body rows */}
      <div>
        {data.rows.map((rName, i) => (
          <div key={`r-${i}`} className="hm-row">
            {/* Row label */}
            <div
              title={rName}
              className="hm-row-label"
            >
              {rName}
            </div>

            {/* Cells */}
            {data.cols.map((cName, j) => {
              const v = data.matrix[i]?.[j] ?? null;
              const isDiag = rName === cName;
              const bg = isDiag ? "#d9d9d9" : corrToColor(v);
              const label = showValues && v !== null ? v.toFixed(2) : "";
              const title = `${rName} × ${cName}: ${v === null ? "—" : v.toFixed(3)}`;
              return (
                <button
                  key={`c-${i}-${j}`}
                  title={title}
                  onClick={() =>
                    onCellClick?.({ rowIndex: i, colIndex: j, rowPlayer: rName, colPlayer: cName, value: v })
                  }
                  className="hm-cell-button"
                  style={{
                    background: bg,
                    color: labelColor(v, isDiag),
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="hm-legend">
        <span>−1</span>
        <div className="hm-legend-scale" />
        <span>+1</span>
        <span className="hm-legend-note">grey = diagonal / missing</span>
      </div>
    </div>
  );
}
