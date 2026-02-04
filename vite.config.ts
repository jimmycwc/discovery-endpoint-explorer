import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    // Dev-only proxy to avoid CORS when fetching discovery/JWKS from localhost
    {
      name: "proxy-discovery",
      configureServer(server) {
        server.middlewares.use("/api/proxy", async (req, res, next) => {
          if (req.method !== "GET") {
            next();
            return;
          }
          const url = req.url?.startsWith("/") ? new URL(req.url, "http://localhost").searchParams.get("url") : null;
          if (!url) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing query parameter: url" }));
            return;
          }
          try {
            const target = new URL(url);
            if (!["https:", "http:"].includes(target.protocol)) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid URL protocol" }));
              return;
            }
            const response = await fetch(url, {
              headers: { Accept: "application/json" },
              redirect: "follow",
            });
            const contentType = response.headers.get("content-type") ?? "application/json";
            res.statusCode = response.status;
            res.setHeader("Content-Type", contentType);
            const body = await response.text();
            res.end(body);
          } catch (err) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Proxy request failed" }));
          }
        });
      },
    },
  ],
  base: "./",
});
