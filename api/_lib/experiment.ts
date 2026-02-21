// ── Types ──────────────────────────────────────────────────────────

export interface TableSpec {
  title: string;
  columns: string[];
  rows: string[][];
}

export type ComparisonVerdict = "PASS" | "WEAK_PASS" | "FAIL";

export interface ComparisonResult {
  verdict: ComparisonVerdict;
  columnOverlap: number;
  rowCountConsistent: boolean;
  schemaValid: boolean;
  reason: string;
}

export interface MetamorphicRelation {
  name: string;
  makePrompts: (basePrompt: string) => { promptA: string; promptB: string };
}

export interface ExperimentLogEntry {
  timestamp: string;
  prompt: string;
  model: string;
  temperature: number;
  top_p: number;
  raw: string;
  parsed: TableSpec | null;
  valid: boolean;
  latencyMs: number;
}

export interface BatchResult {
  relation: string;
  iteration: number;
  promptA: string;
  promptB: string;
  resultA: TableSpec | null;
  resultB: TableSpec | null;
  comparison: ComparisonResult;
  errorA?: string;
  errorB?: string;
}

// ── OpenAI Config ──────────────────────────────────────────────────

export function getOpenAIConfig(): { baseURL: string; apiKey: string } {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (gatewayKey) {
    return { baseURL: "https://ai-gateway.vercel.sh/v1", apiKey: gatewayKey };
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return { baseURL: "https://api.openai.com/v1", apiKey: openaiKey };
  }
  throw new Error("Missing OPENAI_API_KEY or AI_GATEWAY_API_KEY env var");
}

export function getModelName(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export const SYSTEM_PROMPT = `You are a data-table generator. Given a user prompt, return ONLY valid JSON matching this schema:
{
  "title": "<short descriptive title>",
  "columns": ["col1", "col2", ...],
  "rows": [["cell", "cell", ...], ...]
}
Rules:
- Every row must have exactly as many cells as there are columns.
- All values must be strings.
- Do NOT wrap in markdown code fences or add any text outside the JSON object.`;

// ── Validation ─────────────────────────────────────────────────────

export function isValidTableSpec(obj: unknown): obj is TableSpec {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.title !== "string") return false;
  if (!Array.isArray(o.columns) || !o.columns.every((c) => typeof c === "string")) return false;
  if (!Array.isArray(o.rows)) return false;
  for (const row of o.rows) {
    if (!Array.isArray(row) || !row.every((cell) => typeof cell === "string")) return false;
  }
  return true;
}

// ── OpenAI Wrapper ─────────────────────────────────────────────────

export async function callOpenAI(
  prompt: string,
  repairContext?: string,
): Promise<{ raw: string; parsed: unknown }> {
  const { baseURL, apiKey } = getOpenAIConfig();
  const model = getModelName();

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  if (repairContext) {
    messages.push({
      role: "user",
      content: `Your previous response was invalid JSON or did not match the schema. Here it is:\n${repairContext}\nPlease fix it and return valid JSON matching the schema.`,
    });
  }

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      top_p: 1,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }

  const json = await res.json();
  const raw: string = json.choices?.[0]?.message?.content ?? "";
  return { raw, parsed: JSON.parse(raw) };
}

// ── Enhanced Comparison ────────────────────────────────────────────

export function compareStructure(a: TableSpec, b: TableSpec): ComparisonResult {
  const schemaValidA = a.rows.every((row) => row.length === a.columns.length);
  const schemaValidB = b.rows.every((row) => row.length === b.columns.length);
  const schemaValid = schemaValidA && schemaValidB;

  const rowCountConsistent = a.rows.length === b.rows.length;

  // Column overlap ratio (case-insensitive)
  const colsA = new Set(a.columns.map((c) => c.toLowerCase()));
  const colsB = new Set(b.columns.map((c) => c.toLowerCase()));
  const union = new Set([...colsA, ...colsB]);
  const intersection = [...colsA].filter((c) => colsB.has(c));
  const columnOverlap = union.size === 0 ? 1 : intersection.length / union.size;

  // Determine verdict
  let verdict: ComparisonVerdict;
  let reason: string;

  if (columnOverlap === 1 && rowCountConsistent && schemaValid) {
    verdict = "PASS";
    reason = "Structures match";
  } else if (columnOverlap >= 0.5 && schemaValid) {
    const issues: string[] = [];
    if (columnOverlap < 1) issues.push(`column overlap ${Math.round(columnOverlap * 100)}%`);
    if (!rowCountConsistent) issues.push(`row count ${a.rows.length} vs ${b.rows.length}`);
    verdict = "WEAK_PASS";
    reason = `Partial match: ${issues.join(", ")}`;
  } else {
    const issues: string[] = [];
    if (columnOverlap < 0.5) issues.push(`low column overlap ${Math.round(columnOverlap * 100)}%`);
    if (!schemaValid) issues.push("schema invalid");
    if (!rowCountConsistent) issues.push(`row count ${a.rows.length} vs ${b.rows.length}`);
    verdict = "FAIL";
    reason = issues.join(", ");
  }

  return { verdict, columnOverlap, rowCountConsistent, schemaValid, reason };
}

// ── In-Memory Logging ──────────────────────────────────────────────

const experimentLogs: ExperimentLogEntry[] = [];

export function addLog(entry: ExperimentLogEntry): void {
  experimentLogs.push(entry);
}

export function getLogs(): ExperimentLogEntry[] {
  return experimentLogs;
}

export function clearLogs(): void {
  experimentLogs.length = 0;
}

// ── Metamorphic Relations ──────────────────────────────────────────

export const METAMORPHIC_RELATIONS: MetamorphicRelation[] = [
  {
    name: "UPPER vs lower case",
    makePrompts: (base) => ({
      promptA: base.toUpperCase(),
      promptB: base.toLowerCase(),
    }),
  },
  {
    name: '"show" vs "display" prefix',
    makePrompts: (base) => ({
      promptA: `show ${base}`,
      promptB: `display ${base}`,
    }),
  },
  {
    name: 'with/without "in a table" suffix',
    makePrompts: (base) => ({
      promptA: base,
      promptB: `${base} in a table`,
    }),
  },
  {
    name: "idempotency (same prompt twice)",
    makePrompts: (base) => ({
      promptA: base,
      promptB: base,
    }),
  },
];

// ── Batch Runner ───────────────────────────────────────────────────

export async function runBatchExperiment(
  prompt: string,
  iterations: number,
): Promise<BatchResult[]> {
  const clamped = Math.max(1, Math.min(20, iterations));
  const results: BatchResult[] = [];

  for (let i = 0; i < clamped; i++) {
    for (const relation of METAMORPHIC_RELATIONS) {
      const { promptA, promptB } = relation.makePrompts(prompt);
      let resultA: TableSpec | null = null;
      let resultB: TableSpec | null = null;
      let errorA: string | undefined;
      let errorB: string | undefined;

      const startA = Date.now();
      try {
        const responseA = await callOpenAI(promptA);
        const latencyA = Date.now() - startA;
        if (isValidTableSpec(responseA.parsed)) {
          resultA = responseA.parsed;
        }
        addLog({
          timestamp: new Date().toISOString(),
          prompt: promptA,
          model: getModelName(),
          temperature: 0,
          top_p: 1,
          raw: responseA.raw,
          parsed: resultA,
          valid: resultA !== null,
          latencyMs: latencyA,
        });
      } catch (err) {
        errorA = err instanceof Error ? err.message : String(err);
      }

      const startB = Date.now();
      try {
        const responseB = await callOpenAI(promptB);
        const latencyB = Date.now() - startB;
        if (isValidTableSpec(responseB.parsed)) {
          resultB = responseB.parsed;
        }
        addLog({
          timestamp: new Date().toISOString(),
          prompt: promptB,
          model: getModelName(),
          temperature: 0,
          top_p: 1,
          raw: responseB.raw,
          parsed: resultB,
          valid: resultB !== null,
          latencyMs: latencyB,
        });
      } catch (err) {
        errorB = err instanceof Error ? err.message : String(err);
      }

      const comparison =
        resultA && resultB
          ? compareStructure(resultA, resultB)
          : {
              verdict: "FAIL" as ComparisonVerdict,
              columnOverlap: 0,
              rowCountConsistent: false,
              schemaValid: false,
              reason: errorA || errorB || "One or both calls failed",
            };

      results.push({
        relation: relation.name,
        iteration: i + 1,
        promptA,
        promptB,
        resultA,
        resultB,
        comparison,
        errorA,
        errorB,
      });
    }
  }

  return results;
}
