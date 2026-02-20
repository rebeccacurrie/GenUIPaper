import type { IncomingMessage, ServerResponse } from "node:http";
import { getModelName } from "../lib/experiment";

export async function handleApiConfig(
  _req: IncomingMessage,
  res: ServerResponse,
) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    model: getModelName(),
    temperature: 0,
    top_p: 1,
    version: "1.0",
  }));
}
