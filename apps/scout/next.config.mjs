import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppEnv } from './scripts/load-env.mjs';

const appDir = path.dirname(fileURLToPath(import.meta.url));
loadAppEnv(appDir);

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.DIST_DIR || '.next',
  serverExternalPackages: ['pdfkit', 'pg'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
    ],
  },
};

export default nextConfig;
