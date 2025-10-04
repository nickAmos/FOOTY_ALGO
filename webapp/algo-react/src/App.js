import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from "react";

function App() {
  const [csvData, setCsvData] = useState(null);

  useEffect(() => {
    fetch("/data/Hawthorn/DispDiff_vs_DispDiff/hawthorn_Dispdiff_vs_Dispdiff_corr.csv")
      .then(response => {
        if (!response.ok) throw new Error("Failed to load CSV");
        return response.text();
      })
      .then(text => {
        console.log("CSV content:", text);
        setCsvData(text);
      })
      .catch(err => console.error(err));
  }, []);

  
  return (
    <div className="App">
      <div style={{ padding: "20px" }}>
        <h1>CSV Test</h1>
        {csvData ? <pre>{csvData.slice(0, 300)}...</pre> : <p>Loading CSV...</p>}
      </div>
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
