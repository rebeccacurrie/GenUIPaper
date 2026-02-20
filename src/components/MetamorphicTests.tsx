import { useState } from "react";
import { generateTable } from "../lib/tableClient";
import type { TableSpec } from "../lib/tableSpec";
import {
  METAMORPHIC_RELATIONS,
  compareStructure,
  type ComparisonVerdict,
} from "../../lib/experiment";

type Status = "pending" | "running" | ComparisonVerdict;

interface TestResult {
  name: string;
  status: Status;
  reason: string;
}

export default function MetamorphicTests({ basePrompt }: { basePrompt: string }) {
  const [results, setResults] = useState<TestResult[]>(
    METAMORPHIC_RELATIONS.map((r) => ({ name: r.name, status: "pending", reason: "" })),
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
      METAMORPHIC_RELATIONS.map((r) => ({ name: r.name, status: "running" as Status, reason: "" })),
    );

    const promises = METAMORPHIC_RELATIONS.map(async (relation, idx) => {
      updateResult(idx, { status: "running" });
      try {
        const { promptA, promptB } = relation.makePrompts(basePrompt);
        const [a, b] = await Promise.all([
          generateTable(promptA),
          generateTable(promptB),
        ]);
        const result = compareStructure(a as TableSpec, b as TableSpec);
        updateResult(idx, { status: result.verdict, reason: result.reason });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateResult(idx, { status: "FAIL", reason: `Error: ${msg}` });
      }
    });

    await Promise.all(promises);
    setRunning(false);
  };

  const badgeClass = (status: Status): string => {
    switch (status) {
      case "PASS": return "test-badge pass";
      case "WEAK_PASS": return "test-badge weak-pass";
      case "FAIL": return "test-badge fail";
      case "running": return "test-badge running";
      default: return "test-badge pending";
    }
  };

  const badgeLabel = (status: Status): string => {
    switch (status) {
      case "WEAK_PASS": return "WEAK PASS";
      default: return status.toUpperCase();
    }
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
            <span className={badgeClass(r.status)}>{badgeLabel(r.status)}</span>
            <span style={{ fontWeight: 600 }}>{r.name}</span>
            {r.reason && <span style={{ color: "#6b7280", fontSize: 13 }}> — {r.reason}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
