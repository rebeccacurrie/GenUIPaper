import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callOpenAI,
  isValidTableSpec,
  addLog,
  getModelName,
} from "./_lib/experiment";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const prompt = req.body?.prompt;
    if (typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).send("Missing or empty 'prompt' field");
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
        return res.status(502).send("AI returned invalid table structure after retry");
      }
    }

    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).send(message);
  }
}
