import type { GeneratedSpec } from "./types";

/**
 * Deterministic spec generator: maps a user prompt to a json-render Spec.
 */
export function generateSpec(prompt: string): GeneratedSpec {
  const p = prompt.toLowerCase();

  if (p.includes("average") || p.includes("mean")) {
    return {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Average Order Value" },
          children: ["metric"],
        },
        metric: {
          type: "Metric",
          props: { label: "Average", value: "$12,450" },
        },
      },
    };
  }

  if (p.includes("table")) {
    return {
      root: "table",
      elements: {
        table: {
          type: "Table",
          props: {
            columns: ["ID", "Name", "Value"],
            data: [
              ["1", "Alpha", "100"],
              ["2", "Beta", "200"],
              ["3", "Gamma", "300"],
            ],
          },
        },
      },
    };
  }

  if (p.includes("chart")) {
    return {
      root: "chart",
      elements: {
        chart: {
          type: "Chart",
          props: { title: "Bar Chart" },
        },
      },
    };
  }

  if (p.includes("text")) {
    return {
      root: "text",
      elements: {
        text: {
          type: "Text",
          props: { content: "This is a generated text response." },
        },
      },
    };
  }

  // Default fallback
  return {
    root: "text",
    elements: {
      text: {
        type: "Text",
        props: { content: "I did not understand the prompt." },
      },
    },
  };
}
