import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Modul Argon2id memakai binding native; jangan di-bundle oleh Next.js.
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
