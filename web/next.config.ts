import fs from 'fs';
import path from 'path';
import type { NextConfig } from "next";

const DEFAULT_API_PORT = '8081';

const getApiUrl = (): string => {
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

const API_URL = getApiUrl();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`
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
