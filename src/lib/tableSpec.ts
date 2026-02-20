import type { GeneratedSpec } from "../types";

export type { TableSpec } from "../../lib/experiment";

/** Convert a TableSpec into a json-render Spec (Card wrapping a Table). */
export function tableSpecToRenderSpec(table: {
  title: string;
  columns: string[];
  rows: string[][];
}): GeneratedSpec {
  return {
    root: "card",
    elements: {
      card: {
        type: "Card",
        props: { title: table.title },
        children: ["table"],
      },
      table: {
        type: "Table",
        props: {
          columns: table.columns,
          data: table.rows,
        },
      },
    },
  };
}
