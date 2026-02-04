import React from "react";
import FetchDiscovery from "./FetchDiscovery";
import { DEFAULT_OIDC_DISCOVERY_PATH } from "../utils/discoveryUtils";

const DiscoveryWidget: React.FC = () => {
  return (
    <div
      className="discovery-widget"
      style={{
        width: "100%",
        height: "100%",
        margin: 0,
        padding: 0,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          flex: 1,
          height: "100%",
          minHeight: 0,
          overflow: "auto",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <FetchDiscovery
          discoveryPath={DEFAULT_OIDC_DISCOVERY_PATH}
          defaultPath={DEFAULT_OIDC_DISCOVERY_PATH}
          placeholderBaseUrl="https://auth.example.com"
        />
      </div>
    </div>
  );
};

export default DiscoveryWidget;
