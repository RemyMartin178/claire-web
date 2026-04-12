/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https: data: blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' https: data: blob:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https: pickleglass:",
            ].join("; ")
          }
        ]
      }
    ];
  },
  async redirects() {
    return [
      {
        source: '/download',
        destination: '/api/download',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.API_URL
          ? `${process.env.API_URL}/api/v1/:path*`
          : 'https://claire-web-production.up.railway.app/api/v1/:path*',
      },
    ]
  }
}

module.exports = withSentryConfig(nextConfig, {
  org: 'claire-t5',
  project: 'claire-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
