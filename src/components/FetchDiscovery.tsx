import React, { useState, useRef, useEffect, useMemo } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism.css";
import {
  fetchDiscoveryDocument,
  buildDiscoveryUrl,
  getKeyEndpoints,
  getCapabilities,
  getOtherFields,
  getFetchUrl,
  type DisplayField,
} from "../utils/discoveryUtils";

interface FetchDiscoveryProps {
  discoveryPath: string;
  defaultPath: string;
  placeholderBaseUrl: string;
}

type ViewMode = "endpoints" | "capabilities" | "others" | "raw-json" | "jwks";

const KEY_ENDPOINT_TOOLTIPS: Record<string, { description: string; required: boolean }> = {
  issuer: {
    description: "The issuer identifier. URL that identifies the authorization server.",
    required: true,
  },
  authorization_endpoint: {
    description: "URL of the authorization server's authorization endpoint.",
    required: true,
  },
  token_endpoint: {
    description: "URL of the authorization server's token endpoint.",
    required: true,
  },
  userinfo_endpoint: {
    description: "URL of the UserInfo endpoint (OIDC). Returns claims about the authenticated user.",
    required: false,
  },
  jwks_uri: {
    description: "URL of the server's JSON Web Key Set (JWKS) document.",
    required: true,
  },
  registration_endpoint: {
    description: "URL of the dynamic client registration endpoint.",
    required: false,
  },
  revocation_endpoint: {
    description: "URL of the token revocation endpoint.",
    required: false,
  },
  introspection_endpoint: {
    description: "URL of the token introspection endpoint.",
    required: false,
  },
  end_session_endpoint: {
    description: "URL of the end session (logout) endpoint (OIDC).",
    required: false,
  },
};

const CAPABILITY_TOOLTIPS: Record<string, { description: string; required: boolean }> = {
  claims_supported: {
    description: "JSON array of claim names that the authorization server may supply in the ID token or UserInfo response.",
    required: false,
  },
  scopes_supported: {
    description: "JSON array of OAuth 2.0 scope values supported by the authorization server.",
    required: false,
  },
  code_challenge_methods_supported: {
    description: "JSON array of PKCE code challenge methods supported (e.g. S256, plain).",
    required: false,
  },
  response_types_supported: {
    description: "JSON array of OAuth 2.0 response_type values supported (e.g. code, token).",
    required: true,
  },
  dpop_signing_alg_values_supported: {
    description: "JSON array of JWS signing algorithms supported for DPoP proof JWTs.",
    required: false,
  },
  grant_types_supported: {
    description: "JSON array of OAuth 2.0 grant types supported (e.g. authorization_code, refresh_token).",
    required: false,
  },
  id_token_signing_alg_values_supported: {
    description: "JSON array of JWS signing algorithms supported for the ID token.",
    required: true,
  },
  response_modes_supported: {
    description: "JSON array of response_mode values supported (e.g. query, fragment).",
    required: false,
  },
  subject_types_supported: {
    description: "JSON array of subject identifier types supported (e.g. public, pairwise).",
    required: true,
  },
  token_endpoint_auth_methods_supported: {
    description: "JSON array of client authentication methods supported at the token endpoint.",
    required: false,
  },
};

const styles = {
  input: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "4px",
    border: "1px solid #dee2e6",
    fontSize: "14px",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
    color: "#495057",
    backgroundColor: "#fff",
  },
  label: {
    fontWeight: 600,
    color: "#495057",
    fontSize: "14px",
    marginBottom: "6px",
    display: "block" as const,
    fontFamily: "Inter, sans-serif",
  },
  button: {
    background: "rgb(11, 99, 233)",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    transition: "background-color 0.2s",
  },
  buttonDisabled: {
    background: "#6c757d",
    cursor: "not-allowed",
  },
  error: {
    color: "#721c24",
    marginTop: 16,
    padding: "12px",
    background: "#f8d7da",
    border: "1px solid #f5c6cb",
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "Inter, sans-serif",
  },
  output: {
    background: "#f8f9fa",
    padding: 16,
    borderRadius: 4,
    fontSize: 14,
    marginTop: 6,
    border: "1px solid #e9ecef",
    fontFamily: "monospace",
    lineHeight: 1.5,
    color: "#495057",
    minHeight: "120px",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
    textAlign: "left" as const,
    overflow: "auto",
  },
  endpointCard: {
    marginBottom: 12,
    padding: "12px 16px",
    backgroundColor: "#f8f9fa",
    border: "1px solid #e9ecef",
    borderRadius: 4,
    fontSize: "13px",
    fontFamily: "Inter, sans-serif",
  },
  endpointLabel: {
    fontWeight: 600,
    color: "#495057",
    marginBottom: 4,
  },
  endpointValue: {
    color: "#0b63e9",
    wordBreak: "break-all" as const,
  },
  copyButton: {
    position: "absolute" as const,
    top: "10px",
    right: "10px",
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: "4px",
    padding: "4px",
    width: "28px",
    height: "28px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    transition: "all 0.2s",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  copyButtonSuccess: {
    background: "#0B63E9",
    color: "#fff",
    border: "none",
  },
};

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
  </svg>
);

const FetchDiscovery: React.FC<FetchDiscoveryProps> = ({
  discoveryPath,
  defaultPath,
  placeholderBaseUrl,
}) => {
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [highlightedJson, setHighlightedJson] = useState("");
  const [keyEndpoints, setKeyEndpoints] = useState<DisplayField[]>([]);
  const [capabilities, setCapabilities] = useState<DisplayField[]>([]);
  const [otherFields, setOtherFields] = useState<DisplayField[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedJwkIndex, setCopiedJwkIndex] = useState<number | null>(null);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const [tooltipCapKey, setTooltipCapKey] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"url" | "json">("url");
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("endpoints");
  const [jwksData, setJwksData] = useState<unknown>(null);
  const [jwksError, setJwksError] = useState("");
  const [isLoadingJwks, setIsLoadingJwks] = useState(false);
  const [lastAttemptedUrl, setLastAttemptedUrl] = useState("");
  const [pastedJson, setPastedJson] = useState("");
  const [pasteError, setPasteError] = useState("");
  const preRef = useRef<HTMLPreElement>(null);

  const resolvedPath = discoveryPath || defaultPath;

  useEffect(() => {
    if (rawJson) {
      const jsonGrammar = Prism.languages["json"];
      if (jsonGrammar) {
        setHighlightedJson(Prism.highlight(rawJson, jsonGrammar, "json"));
      } else {
        setHighlightedJson(rawJson);
      }
    } else {
      setHighlightedJson("");
    }
  }, [rawJson]);

  const handleFetch = async (overrideUrl?: string) => {
    setHasAttemptedFetch(true);
    let urlToFetch = (overrideUrl ?? urlInput).trim();
    if (!urlToFetch) {
      setError("Please enter a base URL (e.g. https://auth.example.com) or a full discovery URL.");
      setErrorDetails("");
      setRawJson("");
      setKeyEndpoints([]);
      setCapabilities([]);
      setOtherFields([]);
      setJwksData(null);
      return;
    }
    if (!urlToFetch.includes(resolvedPath)) {
      try {
        const u = new URL(urlToFetch);
        if (u.pathname === "" || u.pathname === "/") {
          urlToFetch = buildDiscoveryUrl(urlToFetch, resolvedPath);
          if (!overrideUrl) {
            setUrlInput(urlToFetch);
          }
        }
      } catch {
        urlToFetch = buildDiscoveryUrl(urlToFetch, resolvedPath);
        if (!overrideUrl) {
          setUrlInput(urlToFetch);
        }
      }
    }

    setIsLoading(true);
    setError("");
    setErrorDetails("");
    setPasteError("");
    setRawJson("");
    setKeyEndpoints([]);
    setCapabilities([]);
    setOtherFields([]);
    setJwksData(null);
    setJwksError("");
    setLastAttemptedUrl(urlToFetch);

    const result = await fetchDiscoveryDocument(urlToFetch);

    if (result.success && result.rawJson != null) {
      setRawJson(result.rawJson);
      if (result.data) {
        setKeyEndpoints(getKeyEndpoints(result.data));
        setCapabilities(getCapabilities(result.data));
        setOtherFields(getOtherFields(result.data));
      }
      setError("");
      setErrorDetails("");
      setLastAttemptedUrl("");
    } else {
      setError(result.error ?? "Failed to fetch discovery document");
      setErrorDetails(result.errorDetails ?? "");
    }

    setIsLoading(false);
  };

  const handleCopy = async () => {
    if (rawJson) {
      try {
        await navigator.clipboard.writeText(rawJson);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleDownloadJson = () => {
    if (!rawJson) return;
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "openid-configuration.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyField = async (value: string, fieldLabel: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldLabel);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handlePasteJson = () => {
    setPasteError("");
    try {
      const data = JSON.parse(pastedJson);
      const rawJson = JSON.stringify(data, null, 2);
      setRawJson(rawJson);
      setKeyEndpoints(getKeyEndpoints(data));
      setCapabilities(getCapabilities(data));
      setOtherFields(getOtherFields(data));
      setError("");
      setErrorDetails("");
      setLastAttemptedUrl("");
    } catch (err) {
      setPasteError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const handleFetchJwks = async () => {
    const data = rawJson ? JSON.parse(rawJson) : null;
    if (!data || typeof data !== "object") {
      setJwksError("No discovery document loaded");
      return;
    }

    const jwksUri = (data as Record<string, unknown>).jwks_uri;
    if (typeof jwksUri !== "string" || !jwksUri.trim()) {
      setJwksError("No jwks_uri found in discovery document");
      return;
    }

    setIsLoadingJwks(true);
    setJwksError("");
    setJwksData(null);

    try {
      const response = await fetch(getFetchUrl(jwksUri), {
        method: "GET",
        headers: { Accept: "application/json" },
        mode: "cors",
      });

      if (!response.ok) {
        setJwksError(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
        setIsLoadingJwks(false);
        return;
      }

      const jwks = await response.json();
      setJwksData(jwks);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setJwksError(`Failed to fetch JWKS: ${message}`);
    }

    setIsLoadingJwks(false);
  };

  const hasJwksUri = useMemo(() => {
    if (!rawJson) return false;
    try {
      const d = JSON.parse(rawJson) as Record<string, unknown>;
      return !!(d && typeof d === "object" && typeof d.jwks_uri === "string" && d.jwks_uri.trim());
    } catch {
      return false;
    }
  }, [rawJson]);

  const discoveryObj = useMemo(() => {
    if (!rawJson) return null;
    try {
      const d = JSON.parse(rawJson);
      return d && typeof d === "object" ? (d as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, [rawJson]);

  const requiredMissing = useMemo(() => {
    if (!discoveryObj) return [] as string[];
    const required: Array<{ key: string; kind: "string" | "stringArray" }> = [
      { key: "issuer", kind: "string" },
      { key: "authorization_endpoint", kind: "string" },
      { key: "jwks_uri", kind: "string" },
      { key: "response_types_supported", kind: "stringArray" },
      { key: "subject_types_supported", kind: "stringArray" },
      { key: "id_token_signing_alg_values_supported", kind: "stringArray" },
    ];
    const missing: string[] = [];
    for (const f of required) {
      const v = discoveryObj[f.key];
      if (f.kind === "string") {
        if (typeof v !== "string" || !v.trim()) missing.push(f.key);
      } else {
        if (!Array.isArray(v) || v.length === 0) missing.push(f.key);
      }
    }
    return missing;
  }, [discoveryObj]);

  useEffect(() => {
    if (!hasJwksUri && viewMode === "jwks") {
      setViewMode("endpoints");
    }
  }, [hasJwksUri, viewMode]);

  useEffect(() => {
    if (otherFields.length === 0 && viewMode === "others") {
      setViewMode("endpoints");
    }
  }, [otherFields.length, viewMode]);

  // Auto-fetch JWKS when switching to JWKS view
  useEffect(() => {
    if (viewMode === "jwks" && !jwksData && !jwksError && !isLoadingJwks && rawJson) {
      handleFetchJwks();
    }
  }, [viewMode]);

  // Auto-fetch JWKS for validation when jwks_uri exists
  useEffect(() => {
    if (hasJwksUri && !jwksData && !jwksError && !isLoadingJwks && rawJson) {
      handleFetchJwks();
    }
  }, [hasJwksUri, rawJson]);

  const viewTabStyle = (isActive: boolean) => ({
    border: "none",
    borderBottom: isActive ? "2px solid rgb(11, 99, 233)" : "2px solid transparent",
    background: "none",
    fontWeight: isActive ? 600 : 400,
    color: isActive ? "rgb(11, 99, 233)" : "#495057",
    cursor: "pointer",
    outline: "none",
    fontFamily: "Inter, sans-serif",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div
      className="discovery-layout"
      style={{
        fontFamily: "Inter, sans-serif",
        color: "#495057",
        padding: "16px",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        gap: 24,
      }}
    >
      <style>
        {`
          .discovery-layout {
            display: flex;
            flex-direction: column;
            overflow: auto;
            min-height: 0;
          }
          .discovery-left-col {
            flex: none;
            display: flex;
            flex-direction: column;
            gap: 0;
            border-right: none;
            border-bottom: 1px solid #e9ecef;
            padding-right: 0;
            padding-bottom: 24px;
          }
          .discovery-right-col {
            flex: none;
            display: flex;
            flex-direction: column;
          }
        `}
      </style>
      {/* Top section: input & controls */}
      <div
        className="discovery-left-col"
        style={rawJson ? undefined : { borderBottom: "none" }}
      >
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: "#6c757d",
              marginBottom: 10,
              textTransform: "uppercase" as const,
              letterSpacing: "0.5px",
            }}
          >
            Input
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 12,
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                color: "#495057",
                padding: "12px 14px",
                borderRadius: 6,
                border:
                  inputMode === "url" ? "2px solid rgb(11, 99, 233)" : "1px solid #dee2e6",
                background: inputMode === "url" ? "rgba(11, 99, 233, 0.10)" : "#fff",
                flex: "0 0 220px",
                userSelect: "none",
              }}
            >
              <input
                type="radio"
                name="inputMode"
                checked={inputMode === "url"}
                onChange={() => setInputMode("url")}
                style={{
                  cursor: "pointer",
                  accentColor: "rgb(11, 99, 233)",
                  transform: "scale(1.15)",
                }}
              />
              Base URL
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                color: "#495057",
                padding: "12px 14px",
                borderRadius: 6,
                border:
                  inputMode === "json" ? "2px solid rgb(11, 99, 233)" : "1px solid #dee2e6",
                background: inputMode === "json" ? "rgba(11, 99, 233, 0.10)" : "#fff",
                flex: "0 0 220px",
                userSelect: "none",
              }}
            >
              <input
                type="radio"
                name="inputMode"
                checked={inputMode === "json"}
                onChange={() => setInputMode("json")}
                style={{
                  cursor: "pointer",
                  accentColor: "rgb(11, 99, 233)",
                  transform: "scale(1.15)",
                }}
              />
              JSON
            </label>
          </div>
        </div>

        {inputMode === "url" && (
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Base URL or full discovery URL</label>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={placeholderBaseUrl + resolvedPath}
                style={{ ...styles.input, flex: 1, minWidth: 0 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    handleFetch();
                  }
                }}
              />
              <button
                onClick={() => handleFetch()}
                disabled={isLoading}
                style={{
                  ...styles.button,
                  ...(isLoading ? styles.buttonDisabled : {}),
                  flexShrink: 0,
                  padding: "0 16px",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isLoading ? "Fetching…" : "Fetch"}
              </button>
            </div>
          </div>
        )}

        {inputMode === "url" && hasAttemptedFetch && error && (
          <div style={{ ...styles.error, marginTop: 16, marginBottom: 16, whiteSpace: "pre-line" as const }}>
            <strong>Error:</strong>
            {"\n"}
            {error}
            {errorDetails && (
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                <strong>Details:</strong>
                <pre
                  style={{
                    marginTop: 4,
                    padding: 8,
                    background: "#fff",
                    border: "1px solid #f5c6cb",
                    borderRadius: 4,
                    fontSize: 12,
                    overflow: "auto",
                    maxHeight: 200,
                  }}
                >
                  {errorDetails}
                </pre>
              </div>
            )}
            {lastAttemptedUrl && error.toLowerCase().includes("cors") && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => window.open(lastAttemptedUrl, "_blank")}
                  style={{
                    background: "#0b63e9",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Open URL in New Tab
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(lastAttemptedUrl)}
                  style={{
                    background: "#6c757d",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Copy URL
                </button>
              </div>
            )}
            {lastAttemptedUrl && error.toLowerCase().includes("cors") && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: 4,
                  fontSize: 13,
                  color: "#856404",
                }}
              >
                <strong>💡 Workarounds:</strong>
                <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 20 }}>
                  <li>Click "Open URL in New Tab" to view the JSON directly in your browser</li>
                  <li>
                    Install a CORS browser extension (e.g.,{" "}
                    <a
                      href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0b63e9" }}
                    >
                      Allow CORS
                    </a>
                  )
                  </li>
                  <li>Use a server-side proxy that adds CORS headers</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {inputMode === "json" && (
          <div>
            <label style={styles.label}>Paste Discovery Document JSON</label>
            <textarea
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='Paste the JSON from the discovery endpoint here...'
              style={{
                ...styles.input,
                minHeight: 200,
                fontFamily: "monospace",
                fontSize: 13,
                resize: "vertical",
              }}
            />
            <button
              onClick={handlePasteJson}
              disabled={!pastedJson.trim()}
              style={{
                ...styles.button,
                marginTop: 8,
                ...((!pastedJson.trim()) ? styles.buttonDisabled : {}),
              }}
            >
              Parse JSON
            </button>
            {pasteError && (
              <div style={{ ...styles.error, marginTop: 12 }}>
                <strong>Error:</strong> {pasteError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom section: endpoints & results */}
      <div className="discovery-right-col">
        {rawJson ? (
          <>
            <style>
              {`
                .discovery-view-tabs {
                  display: flex;
                  flex-wrap: nowrap;
                  flex-shrink: 0;
                  min-width: 0;
                  width: 100%;
                  font-size: 14px;
                  overflow-x: auto;
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: thin;
                }
                .discovery-view-tab {
                  flex: 1 1 0;
                  min-width: 80px;
                  width: 100%;
                  white-space: nowrap;
                  text-align: center;
                  font-size: 14px;
                  padding: 8px 12px;
                  flex-shrink: 0;
                  box-sizing: border-box;
                  overflow: hidden;
                }
                @media (max-width: 1200px) {
                  .discovery-view-tab {
                    white-space: normal !important;
                    line-height: 1.3 !important;
                  }
                }
                @media (max-width: 1024px) {
                  .discovery-view-tab {
                    font-size: 12px !important;
                    padding: 6px 8px !important;
                    white-space: normal !important;
                    line-height: 1.3 !important;
                  }
                }
                @media (max-width: 900px) {
                  .discovery-view-tabs {
                    overflow-x: hidden !important;
                  }
                  .discovery-view-tab {
                    min-width: 0 !important;
                    flex-shrink: 1 !important;
                  }
                }
                @media (max-width: 768px) {
                  .discovery-view-tabs {
                    justify-content: space-between;
                  }
                  .discovery-view-tab {
                    font-size: 11px !important;
                    padding: 6px 4px !important;
                    white-space: normal !important;
                    line-height: 1.3 !important;
                  }
                }
                @media (max-width: 640px) {
                  .discovery-view-tab {
                    font-size: 10px !important;
                    padding: 5px 3px !important;
                  }
                }
                @media (max-width: 480px) {
                  .discovery-view-tab {
                    font-size: 9px !important;
                    padding: 5px 2px !important;
                  }
                }
              `}
            </style>
            <div
              className="discovery-view-tabs"
              style={{ borderBottom: "1px solid #dee2e6" }}
            >
              <button
                className="discovery-view-tab"
                style={viewTabStyle(viewMode === "endpoints")}
                onClick={() => setViewMode("endpoints")}
              >
                Key Endpoints
              </button>
              <button
                className="discovery-view-tab"
                style={viewTabStyle(viewMode === "capabilities")}
                onClick={() => setViewMode("capabilities")}
              >
                Capabilities
              </button>
              {otherFields.length > 0 && (
                <button
                  className="discovery-view-tab"
                  style={viewTabStyle(viewMode === "others")}
                  onClick={() => setViewMode("others")}
                >
                  Others
                </button>
              )}
              <button
                className="discovery-view-tab"
                style={viewTabStyle(viewMode === "raw-json")}
                onClick={() => setViewMode("raw-json")}
              >
                Raw JSON
              </button>
              {hasJwksUri && (
                <button
                  className="discovery-view-tab"
                  style={viewTabStyle(viewMode === "jwks")}
                  onClick={() => setViewMode("jwks")}
                >
                  JWKS
                </button>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              {viewMode === "endpoints" && (
                <>
                  {requiredMissing.length > 0 && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "10px 14px",
                        borderRadius: 6,
                        border: "1px solid #f8d7da",
                        background: "#f8d7da",
                        color: "#721c24",
                        fontSize: 13,
                      }}
                    >
                      <strong>These required fields are missing:</strong>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          alignItems: "center",
                          marginTop: 8,
                        }}
                      >
                        {requiredMissing.map((key) => (
                          <span
                            key={key}
                            style={{
                              display: "inline-block",
                              padding: "6px 12px",
                              borderRadius: 6,
                              backgroundColor: "#fce8ea",
                              color: "#a94442",
                              fontSize: 13,
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {keyEndpoints.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {keyEndpoints.map((ep) => (
                    <div key={ep.key} style={{ ...styles.endpointCard, position: "relative" }}>
                      <div
                        style={{
                          ...styles.endpointLabel,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          paddingRight: 44,
                        }}
                      >
                        <span
                          style={{ position: "relative" as const, display: "inline-block" }}
                          onMouseEnter={() => KEY_ENDPOINT_TOOLTIPS[ep.key] && setTooltipKey(ep.key)}
                          onMouseLeave={() => setTooltipKey(null)}
                        >
                          <span
                            style={
                              KEY_ENDPOINT_TOOLTIPS[ep.key]
                                ? {
                                    cursor: "help" as const,
                                    borderBottom: "1px dotted #0B63E9",
                                  }
                                : undefined
                            }
                          >
                            {ep.label}
                          </span>
                          {KEY_ENDPOINT_TOOLTIPS[ep.key] && tooltipKey === ep.key && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "100%",
                                left: 0,
                                marginBottom: 8,
                                padding: "8px 12px",
                                backgroundColor: "#f0f8ff",
                                border: "2px solid #0B63E9",
                                borderRadius: 6,
                                color: "#0B63E9",
                                fontSize: 13,
                                fontWeight: 500,
                                fontFamily: "Inter, sans-serif",
                                lineHeight: 1.4,
                                whiteSpace: "normal",
                                minWidth: 320,
                                maxWidth: 480,
                                boxShadow: "0 4px 12px rgba(11, 99, 233, 0.15)",
                                zIndex: 1000,
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  backgroundColor: KEY_ENDPOINT_TOOLTIPS[ep.key].required ? "#d4edda" : "#e9ecef",
                                  color: KEY_ENDPOINT_TOOLTIPS[ep.key].required ? "#155724" : "#495057",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  marginBottom: 6,
                                }}
                              >
                                {KEY_ENDPOINT_TOOLTIPS[ep.key].required ? "Required" : "Optional"}
                              </span>
                              <div style={{ marginTop: 4 }}>
                                {KEY_ENDPOINT_TOOLTIPS[ep.key].description}
                              </div>
                              <span
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 15,
                                  width: 0,
                                  height: 0,
                                  borderLeft: "8px solid transparent",
                                  borderRight: "8px solid transparent",
                                  borderTop: "8px solid #0B63E9",
                                }}
                              />
                              <span
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 17,
                                  width: 0,
                                  height: 0,
                                  borderLeft: "6px solid transparent",
                                  borderRight: "6px solid transparent",
                                  borderTop: "6px solid #f0f8ff",
                                }}
                              />
                            </div>
                          )}
                        </span>
                      </div>
                      <div style={styles.endpointValue}>{ep.value}</div>
                      <button
                        onClick={() => handleCopyField(ep.value, `endpoint-${ep.key}`)}
                        title={copiedField === `endpoint-${ep.key}` ? "Copied!" : "Copy"}
                        style={{
                          ...styles.copyButton,
                          ...(copiedField === `endpoint-${ep.key}` ? styles.copyButtonSuccess : {}),
                        }}
                      >
                        {copiedField === `endpoint-${ep.key}` ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                  ))}
                </div>
                  )}
                </>
              )}

              {viewMode === "others" && otherFields.length === 0 && (
                <div
                  style={{
                    padding: 16,
                    color: "#6c757d",
                    fontSize: 14,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  No other fields in this document.
                </div>
              )}
              {viewMode === "others" && otherFields.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {otherFields.map((field) => {
                    const fieldId = `other-${field.key}`;
                    return (
                      <div
                        key={field.key}
                        style={{ ...styles.endpointCard, position: "relative" }}
                      >
                        <div style={styles.endpointLabel}>{field.label}</div>
                        <div style={{ ...styles.endpointValue, whiteSpace: "pre-wrap" as const }}>
                          {field.value}
                        </div>
                        <button
                          onClick={() => handleCopyField(field.value, fieldId)}
                          title={copiedField === fieldId ? "Copied!" : "Copy"}
                          style={{
                            ...styles.copyButton,
                            ...(copiedField === fieldId ? styles.copyButtonSuccess : {}),
                          }}
                        >
                          {copiedField === fieldId ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "capabilities" && capabilities.length === 0 && (
                <div
                  style={{
                    padding: 16,
                    color: "#6c757d",
                    fontSize: 14,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  No capability fields found in this document.
                </div>
              )}
              {viewMode === "capabilities" && capabilities.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {capabilities.map((cap) => {
                    const tags = cap.value.split(", ").filter(Boolean);
                    return (
                      <div
                        key={cap.key}
                        style={{
                          ...styles.endpointCard,
                          padding: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#495057",
                            fontFamily: "Inter, sans-serif",
                            marginBottom: 12,
                          }}
                        >
                          <span
                            style={{ position: "relative" as const, display: "inline-block" }}
                            onMouseEnter={() => CAPABILITY_TOOLTIPS[cap.key] && setTooltipCapKey(cap.key)}
                            onMouseLeave={() => setTooltipCapKey(null)}
                          >
                            <span
                              style={
                                CAPABILITY_TOOLTIPS[cap.key]
                                  ? {
                                      cursor: "help" as const,
                                      borderBottom: "1px dotted #0B63E9",
                                    }
                                  : undefined
                              }
                            >
                              {cap.label}
                            </span>
                            {CAPABILITY_TOOLTIPS[cap.key] && tooltipCapKey === cap.key && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: "100%",
                                  left: 0,
                                  marginBottom: 8,
                                  padding: "8px 12px",
                                  backgroundColor: "#f0f8ff",
                                  border: "2px solid #0B63E9",
                                  borderRadius: 6,
                                  color: "#0B63E9",
                                  fontSize: 13,
                                  fontWeight: 500,
                                  fontFamily: "Inter, sans-serif",
                                  lineHeight: 1.4,
                                  whiteSpace: "normal",
                                  minWidth: 320,
                                  maxWidth: 480,
                                  boxShadow: "0 4px 12px rgba(11, 99, 233, 0.15)",
                                  zIndex: 1000,
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    backgroundColor: CAPABILITY_TOOLTIPS[cap.key].required ? "#d4edda" : "#e9ecef",
                                    color: CAPABILITY_TOOLTIPS[cap.key].required ? "#155724" : "#495057",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    marginBottom: 6,
                                  }}
                                >
                                  {CAPABILITY_TOOLTIPS[cap.key].required ? "Required" : "Optional"}
                                </span>
                                <div style={{ marginTop: 4 }}>
                                  {CAPABILITY_TOOLTIPS[cap.key].description}
                                </div>
                                <span
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 15,
                                    width: 0,
                                    height: 0,
                                    borderLeft: "8px solid transparent",
                                    borderRight: "8px solid transparent",
                                    borderTop: "8px solid #0B63E9",
                                  }}
                                />
                                <span
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 17,
                                    width: 0,
                                    height: 0,
                                    borderLeft: "6px solid transparent",
                                    borderRight: "6px solid transparent",
                                    borderTop: "6px solid #f0f8ff",
                                  }}
                                />
                              </div>
                            )}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          {tags.map((tag, i) => (
                            <span
                              key={`${cap.label}-${i}`}
                              style={{
                                display: "inline-block",
                                padding: "6px 12px",
                                borderRadius: 6,
                                backgroundColor: "#e9ecef",
                                color: "#495057",
                                fontSize: 13,
                                fontFamily: "Inter, sans-serif",
                                wordBreak: "break-all",
                              }}
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "raw-json" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <button
                      onClick={handleDownloadJson}
                      title="Download JSON"
                      style={{
                        ...styles.copyButton,
                        position: "static" as const,
                        background: "#f8f9fa",
                        color: "#212529",
                        border: "1px solid #dee2e6",
                        padding: "0 12px",
                        width: "auto",
                      }}
                    >
                      Download JSON
                    </button>
                    <button
                      onClick={handleCopy}
                      title={copySuccess ? "Copied!" : "Copy"}
                      style={{
                        ...styles.copyButton,
                        ...(copySuccess ? styles.copyButtonSuccess : {}),
                        position: "static" as const,
                        background: copySuccess ? "#0B63E9" : "#f8f9fa",
                        color: copySuccess ? "#fff" : "#212529",
                        border: copySuccess ? "none" : "1px solid #dee2e6",
                      }}
                    >
                      {copySuccess ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                  <pre
                    ref={preRef}
                    style={{ ...styles.output, fontSize: 12 }}
                    dangerouslySetInnerHTML={{
                      __html:
                        highlightedJson ||
                        '<span style="color: #6c757d; font-style: italic;">No content</span>',
                    }}
                  />
                </div>
              )}

              {viewMode === "jwks" && (
                <>
                  {isLoadingJwks && (
                    <div style={{ padding: 16, textAlign: "center", color: "#6c757d" }}>
                      Loading JWKS...
                    </div>
                  )}
                  {jwksError && (
                    <div style={styles.error}>
                      <strong>Error:</strong> {jwksError}
                    </div>
                  )}
                  {jwksData && !jwksError && (() => {
                    const jwks = jwksData as { keys?: unknown[] };
                    const keys = Array.isArray(jwks?.keys) ? jwks.keys : [];
                    const keyCount = keys.length;
                    return (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                            marginBottom: 16,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#495057",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            Keys ({keyCount})
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(jwksData, null, 2));
                              setCopySuccess(true);
                              setTimeout(() => setCopySuccess(false), 2000);
                            }}
                            title={copySuccess ? "Copied!" : "Copy all keys"}
                            style={{
                              ...styles.copyButton,
                              ...(copySuccess ? styles.copyButtonSuccess : {}),
                              position: "static" as const,
                              background: copySuccess ? "#0B63E9" : "#f8f9fa",
                              color: copySuccess ? "#fff" : "#212529",
                              border: copySuccess ? "none" : "1px solid #dee2e6",
                              padding: "0 12px",
                              width: "auto",
                              gap: 6,
                            }}
                          >
                            {copySuccess ? <CheckIcon /> : <CopyIcon />}
                            {copySuccess ? "Copied!" : "Copy all"}
                          </button>
                        </div>
                        {keyCount === 0 ? (
                          <div
                            style={{
                              padding: 16,
                              color: "#6c757d",
                              fontSize: 14,
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            No keys in this JWKS.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {keys.map((key, index) => {
                              const keyObj = key && typeof key === "object" ? key as Record<string, unknown> : {};
                              const kid = typeof keyObj.kid === "string" ? keyObj.kid : "";
                              const kty = typeof keyObj.kty === "string" ? keyObj.kty : "";
                              const label = kid || `Key ${index + 1}${kty ? ` (${kty})` : ""}`;
                              const keyJson = JSON.stringify(key, null, 2);
                              const isCopied = copiedJwkIndex === index;
                              return (
                                <div
                                  key={index}
                                  style={{
                                    ...styles.endpointCard,
                                    padding: 16,
                                    position: "relative",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                      gap: 8,
                                      marginBottom: 10,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: "#495057",
                                        fontFamily: "Inter, sans-serif",
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      {label || `Key ${index + 1}`}
                                    </div>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(keyJson);
                                        setCopiedJwkIndex(index);
                                        setTimeout(() => setCopiedJwkIndex(null), 2000);
                                      }}
                                      title={isCopied ? "Copied!" : "Copy key"}
                                      style={{
                                        ...styles.copyButton,
                                        ...(isCopied ? styles.copyButtonSuccess : {}),
                                        position: "static" as const,
                                        background: isCopied ? "#0B63E9" : "#f8f9fa",
                                        color: isCopied ? "#fff" : "#212529",
                                        border: isCopied ? "none" : "1px solid #dee2e6",
                                        padding: "0 12px",
                                        width: "auto",
                                        gap: 6,
                                      }}
                                    >
                                      {isCopied ? <CheckIcon /> : <CopyIcon />}
                                      {isCopied ? "Copied!" : "Copy"}
                                    </button>
                                  </div>
                                  <pre
                                    style={{
                                      ...styles.output,
                                      marginTop: 0,
                                      marginBottom: 0,
                                      fontSize: 12,
                                      maxHeight: 280,
                                      overflow: "auto",
                                    }}
                                    dangerouslySetInnerHTML={{
                                      __html: Prism.highlight(
                                        keyJson,
                                        Prism.languages["json"],
                                        "json"
                                      ),
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default FetchDiscovery;
