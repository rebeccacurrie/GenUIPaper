import type { IncomingMessage, ServerResponse } from "node:http";
import { getLogs } from "../api/_lib/experiment";

export async function handleApiLogs(
  _req: IncomingMessage,
  res: ServerResponse,
) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(getLogs()));
}
