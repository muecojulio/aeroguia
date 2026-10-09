/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
  "font-src 'self' data:",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isProduction ? ["frame-ancestors 'self'", "upgrade-insecure-requests"] : [])
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: csp }
];

if (isProduction) {
  securityHeaders.push(
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
  );
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }]
      }
    ];
  }
};

export default nextConfig;
