/** @type {import('next').NextConfig} */
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
              "navigate-to 'self' https: http: pickleglass:",
            ].join("; ")
          }
        ]
      }
    ];
  }
}

module.exports = nextConfig 