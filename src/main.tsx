import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { JSONUIProvider } from "@json-render/react";
import { registry } from "./registry";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JSONUIProvider registry={registry}>
      <App />
    </JSONUIProvider>
  </StrictMode>
);
