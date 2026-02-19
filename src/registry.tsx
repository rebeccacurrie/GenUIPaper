import { defineRegistry } from "@json-render/react";
import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => (
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 8,
          padding: 16,
          marginBottom: 8,
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: 18 }}>{props.title}</h3>
        {children}
      </div>
    ),

    Metric: ({ props }) => (
      <div style={{ padding: "8px 0" }}>
        <span style={{ color: "#6b7280" }}>{props.label}: </span>
        <span style={{ fontWeight: 700, fontSize: 20 }}>{props.value}</span>
      </div>
    ),

    Table: ({ props }) => (
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
        }}
      >
        <thead>
          <tr>
            {props.columns.map((col: string) => (
              <th
                key={col}
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid #e5e7eb",
                  padding: "8px 12px",
                  fontWeight: 600,
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.data.map((row: string[], i: number) => (
            <tr key={i}>
              {row.map((cell: string, j: number) => (
                <td
                  key={j}
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),

    Chart: ({ props }) => {
      const bars = [
        { label: "Q1", value: 40, color: "#3b82f6" },
        { label: "Q2", value: 70, color: "#10b981" },
        { label: "Q3", value: 55, color: "#f59e0b" },
        { label: "Q4", value: 90, color: "#ef4444" },
      ];
      return (
        <div>
          <h4 style={{ margin: "0 0 12px 0" }}>{props.title}</h4>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              height: 120,
            }}
          >
            {bars.map((bar) => (
              <div
                key={bar.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${bar.value}%`,
                    backgroundColor: bar.color,
                    borderRadius: "4px 4px 0 0",
                    minHeight: 4,
                  }}
                />
                <span style={{ fontSize: 12, marginTop: 4, color: "#6b7280" }}>
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    },

    Text: ({ props }) => (
      <p style={{ margin: 0, lineHeight: 1.6 }}>{props.content}</p>
    ),
  },
});
