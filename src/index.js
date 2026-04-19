import React from "react";
import { createRoot } from "react-dom/client";

import { MapartProvider } from "./context/MapartContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Root from "./components/root";

import "./index.css";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <MapartProvider>
        <Root />
      </MapartProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
