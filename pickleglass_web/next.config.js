/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const isElectronBuild = process.env.ELECTRON_BUILD === 'true'

const nextConfig = {
  reactStrictMode: true,
  output: isElectronBuild ? 'export' : undefined,
  trailingSlash: isElectronBuild ? true : undefined,
  images: { unoptimized: true },
  async headers() {
    if (isElectronBuild) return []
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https: data: blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' https: data: blob:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https: pickleglass:",
            ].join("; ")
          }
        ]
      }
    ]
  },
  async redirects() {
    if (isElectronBuild) return []
    return [
      {
        source: '/download',
        destination: '/api/download',
        permanent: false,
      },
    ]
  },
  async rewrites() {
    if (isElectronBuild) return []
    return [
      {
        source: '/api/v1/:path((?!tools(?:/|$)|knowledge(?:/|$)).*)',
        destination: process.env.API_URL
          ? `${process.env.API_URL}/api/v1/:path*`
          : 'https://claire-web-production.up.railway.app/api/v1/:path*',
      },
    ]
  },
}

const sentryOptions = {
  org: 'claire-t5',
  project: 'claire-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
}

module.exports = isElectronBuild
  ? nextConfig
  : withSentryConfig(nextConfig, sentryOptions)
