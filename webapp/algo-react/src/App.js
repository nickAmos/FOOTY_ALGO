// src/App.js
import { useMemo, useState } from "react";
import Heatmap from "./Components/heatmap";

// Keep these in sync with your folder/filename casing
const TEAMS = [
  "Hawthorn","Essendon","Collingwood","Sydney","Melbourne",
  "Carlton","Richmond","Geelong","Brisbane","Fremantle",
  "Adelaide","Port-Adelaide","St-Kilda","Western-Bulldogs",
  "Greater-Western-Sydney","Gold-Coast","North-Melbourne","West-Coast"
];

const STATS = ["DispDiff","KickDiff","HbDiff","MarkDiff","Disposals","Kicks","Handballs","Marks","K%","H%"];

// helper to safely build file/paths
const slug = (s) => s.toLowerCase().replace(/\s+/g, "-"); // team file part
const pairFolder = (a,b) => `${a}_vs_${b}`;               // folder name uses original case
const fileName = (team,a,b) => `${slug(team)}_${a.toLowerCase()}_vs_${b.toLowerCase()}_corr.csv`;

export default function App() {
  const [team, setTeam]   = useState("Hawthorn");
  const [stat1, setStat1] = useState("DispDiff");
  const [stat2, setStat2] = useState("KickDiff");

  // Build the URL that points to your symlinked Results:
  // /public/data -> ~/Desktop/Results
  const csvUrl = useMemo(() => (
  `/data/${encodeURIComponent(team)}/${pairFolder(stat1, stat2)}/${fileName(team, stat1, stat2)}`
  ), [team, stat1, stat2]);


  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>AFL Heatmaps</h2>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label>
          Team{" "}
          <select value={team} onChange={(e)=>setTeam(e.target.value)}>
            {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label>
          Stat 1{" "}
          <select value={stat1} onChange={(e)=>setStat1(e.target.value)}>
            {STATS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label>
          Stat 2{" "}
          <select value={stat2} onChange={(e)=>setStat2(e.target.value)}>
            {STATS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {/* Heatmap */}
      <Heatmap
        csvUrl={csvUrl}
        cellSize={26}
        showValues={true}
        title={`${team}: ${stat1} vs ${stat2}`}
        onCellClick={({ rowPlayer, colPlayer, value }) => {
          console.log("Clicked:", { rowPlayer, colPlayer, value, team, stat1, stat2 });
          // TODO: open a side panel / navigate to a page that plots their per-round points
          // e.g. /duo?team=Hawthorn&row=James%20Sicily&col=Jai%20Newcombe&stat1=DispDiff&stat2=KickDiff
        }}
      />
    </div>
  );
}
