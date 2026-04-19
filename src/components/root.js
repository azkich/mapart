import React, { useEffect } from "react";
import { useMapart } from "../context/MapartContext";
import { useLocale } from "../hooks/useLocale";
import MapartController from "./mapart/mapartController";
import "./root.css";

const Root = () => {
  const { state, actions, initializeApp } = useMapart();
  const { getLocaleStringWithNewlines } = useLocale();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Handle warning dismissals
  const handleEdgeWarningDismiss = () => {
    actions.setWarnings(false, false);
  };

  const handleCorruptedPresetWarningDismiss = () => {
    actions.setWarnings(false, false);
  };

  const showCorruptedPresetWarning = () => {
    actions.setWarnings(true, false);
  };

  return (
    <>
      <main className="main-content">
        <MapartController 
          onCorruptedPreset={showCorruptedPresetWarning} 
        />
      </main>
      <div className="fixedMessages">
        {state.displayingEdgeWarning ? (
          <div className="fixedMessage">
            <p>{getLocaleStringWithNewlines("EDGE-WARNING")}</p>
            <button type="button" onClick={handleEdgeWarningDismiss}>
              ✔️
            </button>
          </div>
        ) : null}
        {state.displayingCorruptedPresetWarning ? (
          <div className="fixedMessage">
            <p>{getLocaleStringWithNewlines("BLOCK-SELECTION/PRESETS/IMPORT-ERROR-CORRUPTED")}</p>
            <button type="button" onClick={handleCorruptedPresetWarningDismiss}>
              ❗
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default Root;
