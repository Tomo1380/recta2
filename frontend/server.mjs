import { createRequestHandler } from "@react-router/express";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// Proxy /api requests to Laravel backend
const apiTarget = process.env.API_BASE_URL || "http://localhost:8080";
app.use(
  "/api",
  createProxyMiddleware({
    target: apiTarget,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Express v5 strips the mount path, so we need to prepend /api back
      const fullPath = "/api" + path;
      console.log(`[proxy] ${req.method} ${fullPath} → ${apiTarget}${fullPath}`);
      return fullPath;
    },
  }),
);

// Serve static assets from build/client
app.use(express.static("build/client"));

// Handle SSR with React Router
const build = await import("./build/server/index.js");
app.all("/{*splat}", createRequestHandler({ build }));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
  console.log(`API proxy → ${apiTarget}`);
});
