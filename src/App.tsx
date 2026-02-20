import { useState, useEffect } from "react";
import { Renderer } from "@json-render/react";
import { registry } from "./registry";
import { generateTable } from "./lib/tableClient";
import { tableSpecToRenderSpec } from "./lib/tableSpec";
import MetamorphicTests from "./components/MetamorphicTests";
import type { GeneratedSpec } from "./types";

interface ExperimentConfig {
  model: string;
  temperature: number;
  top_p: number;
  version: string;
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [spec, setSpec] = useState<GeneratedSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTests, setShowTests] = useState(false);
  const [config, setConfig] = useState<ExperimentConfig | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSpec(null);
    try {
      const table = await generateTable(prompt);
      setSpec(tableSpecToRenderSpec(table));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch("/api/logs");
      const logs = await res.json();
      if (!logs.length) {
        alert("No experiment logs to export.");
        return;
      }
      const headers = [
        "timestamp", "prompt", "model", "temperature", "top_p",
        "valid", "latencyMs", "title", "columns", "rowCount", "raw",
      ];
      const csvRows = [headers.join(",")];
      for (const log of logs) {
        const row = [
          log.timestamp,
          `"${(log.prompt || "").replace(/"/g, '""')}"`,
          log.model,
          log.temperature,
          log.top_p,
          log.valid,
          log.latencyMs,
          `"${(log.parsed?.title || "").replace(/"/g, '""')}"`,
          `"${(log.parsed?.columns || []).join("; ")}"`,
          log.parsed?.rows?.length ?? 0,
          `"${(log.raw || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        ];
        csvRows.push(row.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `experiment-logs-${new Date().toISOString().slice(0, 19)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export logs.");
    }
  };

  const examples = [
    "top 5 programming languages by popularity",
    "planets in our solar system",
    "largest countries by area",
    "top 5 countries by population",
  ];

  return (
    <div className="app">
      {config && (
        <div className="version-bar">
          Experiment Build v{config.version} – Temperature={config.temperature} – Model={config.model}
        </div>
      )}
      <div className="input-bar">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a table..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
        <button
          className={`test-btn${showTests ? " active" : ""}`}
          onClick={() => setShowTests((v) => !v)}
        >
          Tests
        </button>
        <button className="test-btn" onClick={handleExportCSV}>
          Export
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && <div className="loading">Generating table...</div>}

      {showTests && <MetamorphicTests basePrompt={prompt} />}

      {!spec && !loading && !showTests && (
        <div className="examples">
          <p>Try a prompt:</p>
          <ul className="example-list">
            {examples.map((ex) => (
              <li key={ex}>"{ex}"</li>
            ))}
          </ul>
        </div>
      )}

      {spec && <Renderer spec={spec} registry={registry} />}
    </div>
  );
}
