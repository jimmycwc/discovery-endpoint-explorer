import React from "react";
import DiscoveryWidget from "./components/DiscoveryWidget";

const App: React.FC = () => {
  return (
    <>
      <style>
        {`
          html, body, #root {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          * {
            box-sizing: border-box;
          }
          .discovery-widget {
            height: 100% !important;
            min-height: 100% !important;
          }
          .discovery-widget > div:first-child {
            height: 100% !important;
            min-height: 100% !important;
            overflow: auto !important;
          }
        `}
      </style>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          margin: 0,
          padding: 0,
          color: "#495057",
          width: "100%",
          height: "100%",
          background: "white",
          overflow: "hidden",
        }}
      >
        <DiscoveryWidget />
      </div>
    </>
  );
};

export default App;
