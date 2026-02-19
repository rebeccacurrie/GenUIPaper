import type { Spec } from "@json-render/core";

/** The spec type used throughout the demo */
export type GeneratedSpec = Spec;

/** A single message in the conversation */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  spec?: GeneratedSpec;
}
