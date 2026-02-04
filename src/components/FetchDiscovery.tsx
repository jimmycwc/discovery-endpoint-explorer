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

  const handleFetch = async () => {
    let urlToFetch = urlInput.trim();
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
        }
      } catch {
        urlToFetch = buildDiscoveryUrl(urlToFetch, resolvedPath);
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

  type ValidationStatus = "pass" | "error" | "pending";
  type FieldValidation = { status: ValidationStatus; message?: string };

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

  const jwksContentValidation: FieldValidation | null = useMemo(() => {
    if (!hasJwksUri) return null;
    if (isLoadingJwks) return { status: "pending", message: "Checking JWKS…" };
    if (jwksError) return { status: "error", message: jwksError };
    if (!jwksData) return { status: "pending", message: "JWKS not fetched yet" };
    if (!jwksData || typeof jwksData !== "object") return { status: "error", message: "JWKS is not an object" };
    const keys = (jwksData as { keys?: unknown }).keys;
    if (!Array.isArray(keys)) return { status: "error", message: "JWKS missing keys[]" };
    return { status: "pass", message: `JWKS keys[]: ${keys.length}` };
  }, [hasJwksUri, isLoadingJwks, jwksError, jwksData]);

  const endpointValidation = useMemo(() => {
    const res: Record<string, FieldValidation> = {};
    if (!discoveryObj) return res;
    const endpointKeys = [
      "issuer",
      "authorization_endpoint",
      "token_endpoint",
      "userinfo_endpoint",
      "jwks_uri",
      "registration_endpoint",
      "revocation_endpoint",
      "introspection_endpoint",
      "end_session_endpoint",
    ];
    for (const key of endpointKeys) {
      const v = discoveryObj[key];
      if (typeof v !== "string" || !v.trim()) {
        res[key] = { status: "error", message: "Missing" };
        continue;
      }
      try {
        const u = new URL(v);
        if (u.protocol !== "https:") {
          res[key] = { status: "error", message: "Must be HTTPS" };
        } else {
          res[key] = { status: "pass", message: "HTTPS absolute URL" };
        }
      } catch {
        res[key] = { status: "error", message: "Invalid URL" };
      }
    }
    // Special: jwks_uri must also return a JWKS with keys[]
    if (res.jwks_uri?.status === "pass" && jwksContentValidation) {
      if (jwksContentValidation.status === "pass") {
        res.jwks_uri = { status: "pass", message: jwksContentValidation.message };
      } else if (jwksContentValidation.status === "pending") {
        res.jwks_uri = { status: "pending", message: jwksContentValidation.message };
      } else {
        res.jwks_uri = { status: "error", message: jwksContentValidation.message };
      }
    }
    return res;
  }, [discoveryObj, jwksContentValidation]);

  const capabilityValidation = useMemo(() => {
    const res: Record<string, FieldValidation> = {};
    if (!discoveryObj) return res;
    const keys = [
      "claims_supported",
      "scopes_supported",
      "code_challenge_methods_supported",
      "response_types_supported",
      "dpop_signing_alg_values_supported",
      "grant_types_supported",
      "id_token_signing_alg_values_supported",
      "response_modes_supported",
      "subject_types_supported",
      "token_endpoint_auth_methods_supported",
    ];
    for (const key of keys) {
      const v = discoveryObj[key];
      if (v === undefined || v === null) {
        res[key] = { status: "error", message: "Missing" };
        continue;
      }
      if (!Array.isArray(v) || v.length === 0) {
        res[key] = { status: "error", message: "Expected non-empty array" };
        continue;
      }
      res[key] = { status: "pass", message: `${v.length} items` };
    }
    return res;
  }, [discoveryObj]);

  const statusPillStyle = (status: ValidationStatus) => {
    if (status === "pass") return { background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" };
    if (status === "pending") return { background: "#e2e3e5", color: "#383d41", border: "1px solid #d6d8db" };
    return { background: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb" };
  };

  const StatusPill: React.FC<{ v?: FieldValidation; compact?: boolean }> = ({ v, compact }) => {
    if (!v) return null;
    return (
      <span
        title={v.message}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: compact ? "1px 5px" : "2px 7px",
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "Inter, sans-serif",
          letterSpacing: 0.2,
          ...statusPillStyle(v.status),
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        {v.status.toUpperCase()}
      </span>
    );
  };

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
            flex-direction: row;
            overflow: hidden;
            min-height: 0;
          }
          .discovery-left-col {
            flex: 1 1 0;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 0;
            overflow-y: auto;
            border-right: 1px solid #e9ecef;
            padding-right: 24px;
            border-bottom: none;
            padding-bottom: 0;
          }
          .discovery-right-col {
            flex: 1 1 0;
            min-width: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          @media (max-width: 768px) {
            .discovery-layout {
              flex-direction: column;
              overflow: auto;
            }
            .discovery-left-col {
              flex: none;
              min-width: auto;
              border-right: none;
              border-bottom: 1px solid #e9ecef;
              padding-right: 0;
              padding-bottom: 24px;
            }
            .discovery-right-col {
              flex: 1 1 0;
              min-width: auto;
              min-height: 200px;
            }
          }
        `}
      </style>
      {/* Left column (or top on small screen): input & controls */}
      <div className="discovery-left-col">
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
              onClick={handleFetch}
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

        {error && (
          <div style={{ ...styles.error, marginTop: 16, marginBottom: 16 }}>
            <strong>Error:</strong> {error}
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: "#e9ecef" }} />
          <span style={{ fontSize: 13, color: "#6c757d", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#e9ecef" }} />
        </div>

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
      </div>

      {/* Right column (or bottom on small screen): endpoints & results */}
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

            <div style={{ flex: 1, minHeight: 0, overflow: "auto", marginTop: 16 }}>
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
                        <span>{ep.label}</span>
                        <StatusPill v={endpointValidation[ep.key]} compact />
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
                          <span>{cap.label}</span>
                          <StatusPill v={capabilityValidation[cap.key]} compact />
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
        ) : (
          <div
            style={{
              padding: "12px 0 0 0",
              color: "#adb5bd",
              fontSize: 14,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Enter a URL and click Fetch, or paste JSON to view endpoints.
          </div>
        )}
      </div>
    </div>
  );
};

export default FetchDiscovery;
