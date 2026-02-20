import type { IncomingMessage, ServerResponse } from "node:http";
import {
  callOpenAI,
  isValidTableSpec,
  addLog,
  getModelName,
} from "../lib/experiment";

// ── Body parser ────────────────────────────────────────────────────
export function readBody(req: IncomingMessage): Promise<string> {
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

    const start = Date.now();
    let response = await callOpenAI(prompt);
    let latency = Date.now() - start;
    let result = response.parsed;

    addLog({
      timestamp: new Date().toISOString(),
      prompt,
      model: getModelName(),
      temperature: 0,
      top_p: 1,
      raw: response.raw,
      parsed: isValidTableSpec(result) ? result : null,
      valid: isValidTableSpec(result),
      latencyMs: latency,
    });

    if (!isValidTableSpec(result)) {
      const raw = JSON.stringify(result);
      const retryStart = Date.now();
      response = await callOpenAI(prompt, raw);
      latency = Date.now() - retryStart;
      result = response.parsed;

      addLog({
        timestamp: new Date().toISOString(),
        prompt: `[retry] ${prompt}`,
        model: getModelName(),
        temperature: 0,
        top_p: 1,
        raw: response.raw,
        parsed: isValidTableSpec(result) ? result : null,
        valid: isValidTableSpec(result),
        latencyMs: latency,
      });

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
