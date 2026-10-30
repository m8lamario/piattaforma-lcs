import type { NextConfig } from "next";
import {
  UPLOAD_ACTION_BODY_LIMIT_BYTES,
  UPLOAD_PROXY_BODY_LIMIT_BYTES,
} from "./src/shared/config/app";

/**
 * Project-relative. An absolute path is treated as a server-relative import
 * (`/home/runner/...`) and Turbopack refuses it.
 */
const generatedClient = "./generated/client.ts";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
    serverActions: {
      bodySizeLimit: UPLOAD_ACTION_BODY_LIMIT_BYTES,
    },
    proxyClientMaxBodySize: UPLOAD_PROXY_BODY_LIMIT_BYTES,
  },
  turbopack: {
    resolveAlias: {
      "@generated/client": generatedClient,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@generated/client": generatedClient,
    };
    return config;
  },
  async headers() {
    const shared = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];
    return [
      {
        source: "/(.*)",
        headers: shared,
      },
      {
        source: "/((?!api/documents/file).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: "/api/documents/file",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
