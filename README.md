# Discovery Endpoint Explorer

A web-based tool for fetching and exploring OpenID Connect and OAuth 2.0 discovery documents. Enter an authorization server base URL or full discovery URL to fetch and view the configuration JSON and key endpoints.

## Features

- **OpenID Configuration**: Fetch `/.well-known/openid-configuration` (OpenID Connect Discovery)
- **OAuth 2.0 Authorization Server**: Fetch `/.well-known/oauth-authorization-server` (RFC 8414)
- **Key endpoints summary**: Issuer, authorization endpoint, token endpoint, JWKS URI, and more
- **JSON output**: Syntax-highlighted discovery document with copy button
- **CORS handling**: Clear error message when the server blocks cross-origin requests

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## Usage

1. Open the application in your browser.
2. Choose a tab:
   - **OpenID Configuration** – for OpenID Connect providers (e.g. `https://auth.example.com/.well-known/openid-configuration`).
   - **OAuth 2.0 Authorization Server** – for OAuth 2.0 authorization server metadata (RFC 8414).
3. Enter the base URL (e.g. `https://auth.example.com`) or the full discovery URL.
4. Click **Fetch discovery document** to load and view the JSON and key endpoints.

## Technologies

- React 18
- TypeScript
- Vite
- Prism.js (syntax highlighting)

## Development

```bash
npm run type-check  # Type checking
npm run preview     # Preview production build
```

## Deployment

1. Build: `npm run build`
2. Deploy the contents of the `dist/` directory to your web server or static hosting (e.g. GitHub Pages).
