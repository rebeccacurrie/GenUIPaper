import type { TableSpec } from "./tableSpec";

export interface TableResult {
  table: TableSpec;
  latencyMs: number;
}

/** POST a prompt to /api/table and return the generated TableSpec with timing. */
export async function generateTable(prompt: string): Promise<TableResult> {
  const start = Date.now();
  const res = await fetch("/api/table", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  const table: TableSpec = await res.json();
  return { table, latencyMs };
}
