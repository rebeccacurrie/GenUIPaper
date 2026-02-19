import type { TableSpec } from "./tableSpec";

/** POST a prompt to /api/table and return the generated TableSpec. */
export async function generateTable(prompt: string): Promise<TableSpec> {
  const res = await fetch("/api/table", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  return res.json();
}
