import type { IncomingMessage, ServerResponse } from "node:http";

// ── TableSpec shape ────────────────────────────────────────────────
interface TableSpec {
  title: string;
  columns: string[];
  rows: string[][];
}

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

// ── OpenAI helpers ─────────────────────────────────────────────────
function getOpenAIConfig(): { baseURL: string; apiKey: string } {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (gatewayKey) {
    return {
      baseURL: "https://ai-gateway.vercel.sh/v1",
      apiKey: gatewayKey,
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      baseURL: "https://api.openai.com/v1",
      apiKey: openaiKey,
    };
  }
  throw new Error("Missing OPENAI_API_KEY or AI_GATEWAY_API_KEY env var");
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

async function callOpenAI(
  prompt: string,
  repairContext?: string,
): Promise<TableSpec> {
  const { baseURL, apiKey } = getOpenAIConfig();

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
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }

  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  return JSON.parse(content);
}

// ── Body parser ────────────────────────────────────────────────────
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

// ── Handler ────────────────────────────────────────────────────────
export async function handleApiTable(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const body = JSON.parse(await readBody(req));
    const prompt = body?.prompt;
    if (typeof prompt !== "string" || prompt.trim() === "") {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing or empty 'prompt' field");
      return;
    }

    // First attempt
    let result = await callOpenAI(prompt);

    if (!isValidTableSpec(result)) {
      // One retry with repair prompt
      const raw = JSON.stringify(result);
      result = await callOpenAI(prompt, raw);

      if (!isValidTableSpec(result)) {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("AI returned invalid table structure after retry");
        return;
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(message);
  }
}
