import { useState } from "react";
import { generateTable } from "../lib/tableClient";
import type { TableSpec } from "../lib/tableSpec";

type Status = "pending" | "running" | "pass" | "fail";

interface TestResult {
  name: string;
  status: Status;
  reason: string;
}

const BASE_PROMPT = "top 5 countries by population";

const TEST_VARIANTS: { name: string; promptA: string; promptB: string }[] = [
  {
    name: "UPPER vs lower case",
    promptA: BASE_PROMPT.toUpperCase(),
    promptB: BASE_PROMPT.toLowerCase(),
  },
  {
    name: '"show" vs "display" prefix',
    promptA: `show ${BASE_PROMPT}`,
    promptB: `display ${BASE_PROMPT}`,
  },
  {
    name: 'with/without "in a table" suffix',
    promptA: BASE_PROMPT,
    promptB: `${BASE_PROMPT} in a table`,
  },
  {
    name: "idempotency (same prompt twice)",
    promptA: BASE_PROMPT,
    promptB: BASE_PROMPT,
  },
];

function compareStructure(a: TableSpec, b: TableSpec): string | null {
  if (a.columns.length !== b.columns.length) {
    return `Column count differs: ${a.columns.length} vs ${b.columns.length}`;
  }

  const colsA = a.columns.map((c) => c.toLowerCase());
  const colsB = b.columns.map((c) => c.toLowerCase());
  for (let i = 0; i < colsA.length; i++) {
    if (colsA[i] !== colsB[i]) {
      return `Column name mismatch at index ${i}: "${a.columns[i]}" vs "${b.columns[i]}"`;
    }
  }

  for (let i = 0; i < a.rows.length; i++) {
    if (a.rows[i].length !== a.columns.length) {
      return `Response A row ${i} has ${a.rows[i].length} cells, expected ${a.columns.length}`;
    }
  }
  for (let i = 0; i < b.rows.length; i++) {
    if (b.rows[i].length !== b.columns.length) {
      return `Response B row ${i} has ${b.rows[i].length} cells, expected ${b.columns.length}`;
    }
  }

  return null;
}

export default function MetamorphicTests() {
  const [results, setResults] = useState<TestResult[]>(
    TEST_VARIANTS.map((v) => ({ name: v.name, status: "pending", reason: "" })),
  );
  const [running, setRunning] = useState(false);

  const updateResult = (idx: number, update: Partial<TestResult>) => {
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...update } : r)),
    );
  };

  const runAll = async () => {
    setRunning(true);
    setResults(
      TEST_VARIANTS.map((v) => ({ name: v.name, status: "running", reason: "" })),
    );

    const promises = TEST_VARIANTS.map(async (variant, idx) => {
      updateResult(idx, { status: "running" });
      try {
        const [a, b] = await Promise.all([
          generateTable(variant.promptA),
          generateTable(variant.promptB),
        ]);
        const failure = compareStructure(a, b);
        if (failure) {
          updateResult(idx, { status: "fail", reason: failure });
        } else {
          updateResult(idx, { status: "pass", reason: "Structures match" });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateResult(idx, { status: "fail", reason: `Error: ${msg}` });
      }
    });

    await Promise.all(promises);
    setRunning(false);
  };

  return (
    <div className="test-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Metamorphic Tests</h3>
        <button className="test-btn" onClick={runAll} disabled={running}>
          {running ? "Running..." : "Run All Tests"}
        </button>
      </div>
      <div className="test-results">
        {results.map((r, i) => (
          <div key={i} className="test-result">
            <span className={`test-badge ${r.status}`}>{r.status.toUpperCase()}</span>
            <span style={{ fontWeight: 600 }}>{r.name}</span>
            {r.reason && <span style={{ color: "#6b7280", fontSize: 13 }}> — {r.reason}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
