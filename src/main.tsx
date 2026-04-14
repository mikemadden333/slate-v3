import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap";
document.head.appendChild(fontLink);

const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body {
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: #F6F8FB;
    color: #111827;
    font-size: 14px;
    line-height: 1.5;
  }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #D1D9E6; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
  ::selection { background: rgba(79, 124, 255, 0.15); }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes slatePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.9); } }
  @keyframes emergencyPulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); } 50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(220, 38, 38, 0); } }
  .skeleton { background: linear-gradient(90deg, #EEF1F6 25%, #E6EBF2 50%, #EEF1F6 75%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite; border-radius: 6px; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
