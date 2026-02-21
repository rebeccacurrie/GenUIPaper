import type { VercelRequest, VercelResponse } from "@vercel/node";

// Note: In-memory logs don't persist across serverless invocations.
// This endpoint returns an empty array on Vercel (logs are per-invocation).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed");
  }
  return res.status(200).json([]);
}
