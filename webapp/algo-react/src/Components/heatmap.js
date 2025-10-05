import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

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

  if (err) return <div style={{ padding: 12, color: "#b91c1c" }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading heatmap…</div>;

  return (
    <div style={{ maxHeight: "75vh", overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
      {title && <div style={{ padding: 10, fontWeight: 600 }}>{title}</div>}

      {/* Header row */}
      <div
        className="hm-header"
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 2,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ padding: 8, fontWeight: 600 }}>Players</div>
        {data.cols.map((c, j) => (
          <div
            key={`h-${j}`}
            title={c}
            style={{
              padding: 4,
              fontSize: 11,
              textAlign: "center",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              borderLeft: "1px solid #f3f4f6",
            }}
          >
            {c}
          </div>
        ))}
      </div>

      {/* Body rows */}
      <div>
        {data.rows.map((rName, i) => (
          <div
            key={`r-${i}`}
            style={{ display: "grid", gridTemplateColumns: gridCols, borderBottom: "1px solid #f3f4f6" }}
          >
            {/* Row label */}
            <div
              title={rName}
              style={{
                position: "sticky",
                left: 0,
                zIndex: 1,
                background: "white",
                padding: 6,
                borderRight: "1px solid #f3f4f6",
                fontSize: 13,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
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
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: bg,
                    color: labelColor(v, isDiag),
                    border: "1px solid #ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    cursor: "pointer",
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, fontSize: 12 }}>
        <span>−1</span>
        <div
          style={{
            height: 10,
            width: 160,
            background: "linear-gradient(90deg, #2b6cb0 0%, #ffffff 50%, #c53030 100%)",
            borderRadius: 4,
            border: "1px solid #e5e7eb",
          }}
        />
        <span>+1</span>
        <span style={{ marginLeft: 12, color: "#6b7280" }}>grey = diagonal / missing</span>
      </div>
    </div>
  );
}