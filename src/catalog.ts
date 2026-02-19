import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string(),
      }),
      slots: ["default"],
      description: "Bordered card container with a title heading",
    },

    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
      }),
      description: "Displays a label with a bold value",
    },

    Table: {
      props: z.object({
        columns: z.array(z.string()),
        data: z.array(z.array(z.string())),
      }),
      description: "HTML table with column headers and string data rows",
    },

    Chart: {
      props: z.object({
        title: z.string(),
      }),
      description: "Placeholder bar chart visualization",
    },

    Text: {
      props: z.object({
        content: z.string(),
      }),
      description: "Simple text paragraph",
    },
  },
});
