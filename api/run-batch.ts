import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runBatchExperiment } from "../lib/experiment";

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
