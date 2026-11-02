import { loadAppEnv } from './scripts/load-env.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appDir = path.dirname(fileURLToPath(import.meta.url));
loadAppEnv(appDir);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg'],
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
