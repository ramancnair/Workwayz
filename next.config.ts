
import type { NextConfig } from 'next';
import os from 'os';

function getLocalIpOrigins(): string[] {
  const ifaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  // always keep the localhost shortcuts
  ips.push('localhost', '127.0.0.1');
  // add the optional port you use for dev (default 3000)
  return ips.flatMap(ip => [ip, `${ip}:3000`]);
}

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  turbopack: {},
  serverExternalPackages: [
    'express',
    'import-in-the-middle',
    'require-in-the-middle',
    '@genkit-ai/google-genai',
    '@genkit-ai/compat-oai',
    'genkit',
  ],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output = config.output || {};
      config.output.chunkLoadTimeout = 300000; // 5 minutes
    }
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: ["*.cloudworkstations.dev", ...getLocalIpOrigins()],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },
  experimental: {
    sri: {
      algorithm: 'sha384',
    },
    serverActions: {
      allowedOrigins: getLocalIpOrigins(),
    },
  },
};

export default nextConfig;
