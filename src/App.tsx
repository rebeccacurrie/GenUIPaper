import { useState } from "react";
import { Renderer } from "@json-render/react";
import { registry } from "./registry";
import { generateTable } from "./lib/tableClient";
import { tableSpecToRenderSpec } from "./lib/tableSpec";
import MetamorphicTests from "./components/MetamorphicTests";
import type { GeneratedSpec } from "./types";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [spec, setSpec] = useState<GeneratedSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTests, setShowTests] = useState(false);

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

  const examples = [
    "top 5 programming languages by popularity",
    "planets in our solar system",
    "largest countries by area",
    "top 5 countries by population",
  ];

  return (
    <div className="app">
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
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && <div className="loading">Generating table...</div>}

      {showTests && <MetamorphicTests />}

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
