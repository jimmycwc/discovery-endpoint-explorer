/**
 * Utilities for fetching and validating OIDC/OAuth 2.0 discovery documents.
 */

export const DEFAULT_OIDC_DISCOVERY_PATH = "/.well-known/openid-configuration";
export const DEFAULT_OAUTH_DISCOVERY_PATH = "/.well-known/oauth-authorization-server";

export interface FetchDiscoveryResult {
  success: boolean;
  data?: unknown;
  rawJson?: string;
  error?: string;
  errorDetails?: string;
  statusCode?: number;
}

export interface DisplayField {
  key: string;
  label: string;
  value: string;
}

/**
 * Normalize a base URL (e.g. "https://auth.example.com" or "https://auth.example.com/") to a URL with the given path.
 */
export function buildDiscoveryUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const pathToUse = path.startsWith("/") ? path : `/${path}`;
    const pathname = url.pathname === "/" ? pathToUse : `${url.pathname.replace(/\/$/, "")}${pathToUse}`;
    url.pathname = pathname;
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * In dev, use the Vite proxy to avoid CORS. In production, use the URL as-is.
 */
export function getFetchUrl(url: string): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Fetch a discovery document from the given URL.
 */
export async function fetchDiscoveryDocument(url: string): Promise<FetchDiscoveryResult> {
  if (!url.trim()) {
    return { success: false, error: "Please enter a discovery URL" };
  }

  let resolvedUrl: string;
  try {
    resolvedUrl = new URL(url).toString();
  } catch {
    return { success: false, error: "Invalid URL format" };
  }

  const fetchUrl = getFetchUrl(resolvedUrl);

  try {
    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      mode: "cors",
    });

    if (!response.ok) {
      // Try to get response body for error details
      let errorDetails = "";
      try {
        const text = await response.text();
        errorDetails = text.slice(0, 500);
      } catch {
        // Ignore if we can't get the body
      }
      
      return {
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`,
        errorDetails: errorDetails || undefined,
        statusCode: response.status,
      };
    }

    let rawText: string;
    
    try {
      rawText = await response.text();
    } catch (err) {
      return {
        success: false,
        error: "Failed to read response body",
        errorDetails: err instanceof Error ? err.message : "Unknown error",
      };
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(rawText);
      const rawJson = JSON.stringify(data, null, 2);
      return { success: true, data, rawJson };
    } catch (parseErr) {
      return {
        success: false,
        error: "JSON parse error: Response is not valid JSON",
        errorDetails: rawText.slice(0, 500),
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isCors = message.toLowerCase().includes("cors") || 
                   message.toLowerCase().includes("network") ||
                   message.toLowerCase().includes("failed to fetch");
    return {
      success: false,
      error: isCors
        ? "Network/CORS error: Cannot reach the server"
        : `Network error: ${message}`,
      errorDetails: isCors
        ? "The request was blocked by CORS policy or the server is unreachable. Try accessing the URL directly in your browser or configure CORS on the server."
        : undefined,
    };
  }
}

/**
 * Extract key endpoints from a discovery document for display.
 */
export function getKeyEndpoints(data: unknown): DisplayField[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const entries: DisplayField[] = [];

  const keys = [
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

  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      entries.push({ key, label, value: val });
    }
  }

  return entries;
}

/**
 * Extract capability fields from a discovery document for display.
 */
export function getCapabilities(data: unknown): DisplayField[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const entries: DisplayField[] = [];

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
    const val = obj[key];
    if (val === undefined || val === null) continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    let value: string;
    if (Array.isArray(val)) {
      value = val.join(", ");
    } else if (typeof val === "string") {
      value = val;
    } else {
      value = JSON.stringify(val);
    }
    if (value.trim()) {
      entries.push({ key, label, value });
    }
  }

  return entries;
}

const KEY_ENDPOINT_KEYS = [
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

const CAPABILITY_KEYS = [
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

const EXCLUDED_KEYS = new Set([...KEY_ENDPOINT_KEYS, ...CAPABILITY_KEYS]);

/**
 * Extract all other fields from a discovery document (not in Key Endpoints or Capabilities).
 */
export function getOtherFields(data: unknown): DisplayField[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const entries: DisplayField[] = [];

  for (const key of Object.keys(obj)) {
    if (EXCLUDED_KEYS.has(key)) continue;
    const val = obj[key];
    if (val === undefined || val === null) continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    let value: string;
    if (Array.isArray(val)) {
      value = val.join(", ");
    } else if (typeof val === "string") {
      value = val;
    } else if (typeof val === "object") {
      value = JSON.stringify(val, null, 2);
    } else {
      value = String(val);
    }
    if (value.trim()) {
      entries.push({ key, label, value });
    }
  }

  return entries;
}
