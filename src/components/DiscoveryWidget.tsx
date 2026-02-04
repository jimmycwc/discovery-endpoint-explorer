import React, { useState } from "react";
import TabNavigation from "./TabNavigation";
import FetchDiscovery from "./FetchDiscovery";
import {
  DEFAULT_OIDC_DISCOVERY_PATH,
  DEFAULT_OAUTH_DISCOVERY_PATH,
} from "../utils/discoveryUtils";
import type { TabType } from "./TabNavigation";

const DiscoveryWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("openid-configuration");

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
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div
        style={{
          marginTop: "60px",
          flex: 1,
          height: "calc(100% - 60px)",
          minHeight: "calc(100% - 60px)",
          overflow: "auto",
          padding: "0px 16px 16px 16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: activeTab === "openid-configuration" ? "block" : "none",
            height: "100%",
            minHeight: "100%",
            overflow: "visible",
          }}
        >
          <FetchDiscovery
            discoveryPath={DEFAULT_OIDC_DISCOVERY_PATH}
            defaultPath={DEFAULT_OIDC_DISCOVERY_PATH}
            placeholderBaseUrl="https://auth.example.com"
          />
        </div>
        <div
          style={{
            display: activeTab === "oauth-authorization-server" ? "block" : "none",
            height: "100%",
            minHeight: "100%",
            overflow: "visible",
          }}
        >
          <FetchDiscovery
            discoveryPath={DEFAULT_OAUTH_DISCOVERY_PATH}
            defaultPath={DEFAULT_OAUTH_DISCOVERY_PATH}
            placeholderBaseUrl="https://auth.example.com"
          />
        </div>
      </div>
    </div>
  );
};

export default DiscoveryWidget;
