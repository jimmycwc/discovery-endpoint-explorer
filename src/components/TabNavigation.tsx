import React from "react";

export type TabType = "openid-configuration" | "oauth-authorization-server";

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const tabStyles = {
  tabBar: {
    display: "flex",
    flexShrink: 0,
    borderBottom: "1px solid #e9ecef",
    backgroundColor: "#fff",
    paddingLeft: "16px",
    paddingRight: "16px",
    gap: 0,
  } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      padding: "18px 20px",
      fontSize: "14px",
      fontWeight: 500,
      color: active ? "#0B63E9" : "#6c757d",
      border: "none",
      borderBottom: active ? "2px solid #0B63E9" : "2px solid transparent",
      backgroundColor: "transparent",
      cursor: "pointer",
      fontFamily: "Inter, sans-serif",
      marginBottom: "-1px",
      transition: "color 0.2s, border-color 0.2s, background-color 0.2s",
    }) as React.CSSProperties,
};

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }
          .discovery-tab:not(.discovery-tab--active):hover {
            background-color: #e9ecef !important;
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          padding: 0,
          width: "100%",
          background: "#fff",
          boxSizing: "border-box",
          ...tabStyles.tabBar,
          boxShadow: "0 1px 0 0 #e9ecef",
        }}
      >
        <div style={{ display: "flex", gap: 0 }}>
          <button
            type="button"
            className={`discovery-tab${activeTab === "openid-configuration" ? " discovery-tab--active" : ""}`}
            style={tabStyles.tab(activeTab === "openid-configuration")}
            onClick={() => setActiveTab("openid-configuration")}
          >
            OpenID Configuration
          </button>
          <button
            type="button"
            className={`discovery-tab${activeTab === "oauth-authorization-server" ? " discovery-tab--active" : ""}`}
            style={tabStyles.tab(activeTab === "oauth-authorization-server")}
            onClick={() => setActiveTab("oauth-authorization-server")}
          >
            OAuth 2.0 Authorization Server
          </button>
        </div>
      </div>
    </>
  );
};

export default TabNavigation;
