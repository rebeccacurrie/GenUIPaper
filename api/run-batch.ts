import type { VercelRequest, VercelResponse } from "@vercel/node";

interface TableSpec {
  title: string;
  columns: string[];
  rows: string[][];
}

type ComparisonVerdict = "PASS" | "WEAK_PASS" | "FAIL";

interface ComparisonResult {
  verdict: ComparisonVerdict;
  columnOverlap: number;
  rowCountConsistent: boolean;
  schemaValid: boolean;
  reason: string;
}

interface MetamorphicRelation {
  name: string;
  makePrompts: (basePrompt: string) => { promptA: string; promptB: string };
}

function getOpenAIConfig(): { baseURL: string; apiKey: string } {
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

function getModelName(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

const SYSTEM_PROMPT = `You are a data-table generator. Given a user prompt, return ONLY valid JSON matching this schema:
{
  "title": "<short descriptive title>",
  "columns": ["col1", "col2", ...],
  "rows": [["cell", "cell", ...], ...]
}
Rules:
- Every row must have exactly as many cells as there are columns.
- All values must be strings.
- Do NOT wrap in markdown code fences or add any text outside the JSON object.`;

function isValidTableSpec(obj: unknown): obj is TableSpec {
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

async function callOpenAI(
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

function compareStructure(a: TableSpec, b: TableSpec): ComparisonResult {
  const schemaValidA = a.rows.every((row) => row.length === a.columns.length);
  const schemaValidB = b.rows.every((row) => row.length === b.columns.length);
  const schemaValid = schemaValidA && schemaValidB;

  const rowCountConsistent = a.rows.length === b.rows.length;

  const colsA = new Set(a.columns.map((c) => c.toLowerCase()));
  const colsB = new Set(b.columns.map((c) => c.toLowerCase()));
  const union = new Set([...colsA, ...colsB]);
  const intersection = [...colsA].filter((c) => colsB.has(c));
  const columnOverlap = union.size === 0 ? 1 : intersection.length / union.size;

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

const METAMORPHIC_RELATIONS: MetamorphicRelation[] = [
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

async function runBatchExperiment(
  prompt: string,
  iterations: number,
): Promise<unknown[]> {
  const clamped = Math.max(1, Math.min(20, iterations));
  const results: unknown[] = [];

  for (let i = 0; i < clamped; i++) {
    for (const relation of METAMORPHIC_RELATIONS) {
      const { promptA, promptB } = relation.makePrompts(prompt);
      let resultA: TableSpec | null = null;
      let resultB: TableSpec | null = null;
      let errorA: string | undefined;
      let errorB: string | undefined;

      try {
        const responseA = await callOpenAI(promptA);
        if (isValidTableSpec(responseA.parsed)) {
          resultA = responseA.parsed;
        }
      } catch (err) {
        errorA = err instanceof Error ? err.message : String(err);
      }

      try {
        const responseB = await callOpenAI(promptB);
        if (isValidTableSpec(responseB.parsed)) {
          resultB = responseB.parsed;
        }
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const prompt = req.body?.prompt;
    const iterations = req.body?.iterations ?? 1;

    if (typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).send("Missing or empty 'prompt' field");
    }
    if (typeof iterations !== "number" || iterations < 1) {
      return res.status(400).send("'iterations' must be a positive number");
    }

    const results = await runBatchExperiment(prompt, iterations);
    return res.status(200).json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).send(message);
  }
}
