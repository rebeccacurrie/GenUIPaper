import type { GeneratedSpec } from "../types";

export interface TableSpec {
  title: string;
  columns: string[];
  rows: string[][];
}

/** Convert a TableSpec into a json-render Spec (Card wrapping a Table). */
export function tableSpecToRenderSpec(table: TableSpec): GeneratedSpec {
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
