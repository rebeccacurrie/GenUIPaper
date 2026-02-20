import type { IncomingMessage, ServerResponse } from "node:http";
import { runBatchExperiment } from "../lib/experiment";
import { readBody } from "./apiTable";

export async function handleApiRunBatch(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const body = JSON.parse(await readBody(req));
    const prompt = body?.prompt;
    const iterations = body?.iterations ?? 1;

    if (typeof prompt !== "string" || prompt.trim() === "") {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing or empty 'prompt' field");
      return;
    }
    if (typeof iterations !== "number" || iterations < 1) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("'iterations' must be a positive number");
      return;
    }

    const results = await runBatchExperiment(prompt, iterations);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(results));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(message);
  }
}
