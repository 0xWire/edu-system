import fs from 'fs';
import path from 'path';
import type { NextConfig } from "next";

const DEFAULT_API_PORT = '8081';
const DEFAULT_INTERNAL_API_URL = 'http://backend:8080';
const DEFAULT_FRONTEND_PORT = '3000';

const getPublicApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  const envLocations = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env')
  ];

  for (const envPath of envLocations) {
    if (!fs.existsSync(envPath)) continue;

    const envContent = fs.readFileSync(envPath, 'utf-8');

    const apiFromEnv = envContent.match(/^\s*NEXT_PUBLIC_API_URL\s*=\s*(.+)\s*$/m);
    if (apiFromEnv?.[1]) {
      return apiFromEnv[1].trim();
    }

    const portMatch = envContent.match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
    if (portMatch?.[1]) {
      return `http://localhost:${portMatch[1]}`;
    }
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
};

const PUBLIC_API_URL = getPublicApiUrl();
const resolveInternalApiUrl = (): string => {
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }

  try {
    const parsedPublic = new URL(PUBLIC_API_URL);
    const host = parsedPublic.hostname.toLowerCase();
    const frontendPort = process.env.PORT || DEFAULT_FRONTEND_PORT;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    // In local dev, when PUBLIC_API_URL points to the frontend itself, avoid rewrite loops.
    if (!(isLocalHost && parsedPublic.port === frontendPort)) {
      return PUBLIC_API_URL;
    }
  } catch {
    // ignore malformed PUBLIC_API_URL and use fallback
  }

  return DEFAULT_INTERNAL_API_URL;
};

const INTERNAL_API_URL = resolveInternalApiUrl();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: PUBLIC_API_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${INTERNAL_API_URL}/api/:path*`
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
