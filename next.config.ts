import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Konteks Cloudflare (D1) hanya diaktifkan secara eksplisit agar `next dev`
// biasa tetap memakai SQLite lokal. Aktifkan dengan OPENNEXT_CLOUDFLARE_DEV=1
// bila ingin mengembangkan terhadap binding D1/miniflare.
if (process.env.OPENNEXT_CLOUDFLARE_DEV === "1") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
