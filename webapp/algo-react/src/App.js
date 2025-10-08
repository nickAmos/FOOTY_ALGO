// src/App.js
import { useMemo, useState } from "react";
import Heatmap from "./Components/heatmap";
import PlotPlayers from "./Components/plotplayers";
import "./styling/App.css";

// Keep these in sync with your folder/filename casing
const TEAMS = [
  "Hawthorn","Essendon","Collingwood","Sydney","Melbourne",
  "Carlton","Richmond","Geelong","Brisbane","Fremantle",
  "Adelaide","Port-Adelaide","St-Kilda","Western-Bulldogs",
  "Greater-Western-Sydney","Gold-Coast","North-Melbourne","West-Coast"
];

const STATS = ["DispDiff","KickDiff","HbDiff","MarkDiff"];

// helper to safely build file/paths
const slug = (s) => s.toLowerCase().replace(/\s+/g, "-"); // team file part
const pairFolder = (a,b) => `${a}_vs_${b}`;               // folder name uses original case
const fileName = (team,a,b) => `${slug(team)}_${a.toLowerCase()}_vs_${b.toLowerCase()}_corr.csv`;

export default function App() {
  const [team, setTeam]   = useState("Hawthorn");
  const [stat1, setStat1] = useState("DispDiff");
  const [stat2, setStat2] = useState("KickDiff");
  const [selectedPlayers, setSelectedPlayers] = useState(null);

  // Build the URL that points to your symlinked Results:
  // /public/data -> ~/Desktop/Results
  const csvUrl = useMemo(() => (
  `/data/${encodeURIComponent(team)}/${pairFolder(stat1, stat2)}/${fileName(team, stat1, stat2)}`
  ), [team, stat1, stat2]);


  return (
    <div className="app-container">
      <h2 className="app-title">AFL Heatmaps</h2>

      {/* Controls */}
      {!selectedPlayers && (
        <div className="app-controls">
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
      )}

      {selectedPlayers ? (
        <PlotPlayers
          rowPlayer={selectedPlayers.rowPlayer}
          colPlayer={selectedPlayers.colPlayer}
          team={selectedPlayers.team}
          stat1={selectedPlayers.stat1}
          stat2={selectedPlayers.stat2}
          onBack={() => setSelectedPlayers(null)}
        />
      ) : (
        <Heatmap
          csvUrl={csvUrl}
          cellSize={26}
          showValues={true}
          title={`${team}: ${stat1} vs ${stat2}`}
          onCellClick={({ rowPlayer, colPlayer }) => {
            setSelectedPlayers({ rowPlayer, colPlayer, team, stat1, stat2 });
          }}
        />
      )}
    </div>
  );
}
