import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getModelName } from "./_lib/experiment";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed");
  }
  return res.status(200).json({
    model: getModelName(),
    temperature: 0,
    top_p: 1,
    version: "1.0",
  });
}
