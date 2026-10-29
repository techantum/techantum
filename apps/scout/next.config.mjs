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
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.facebook.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.instagram.com' },
      { protocol: 'https', hostname: 'media.licdn.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/youtube/projects', destination: '/projects', permanent: false },
      { source: '/youtube/projects/:path*', destination: '/projects/:path*', permanent: false },
    ];
  },
  async rewrites() {
    const platforms = ['facebook', 'instagram', 'linkedin'];
    return [
      { source: '/admin/login', destination: '/admin-login' },
      { source: '/superadmin/login', destination: '/superadmin-login' },
      { source: '/subscriber', destination: '/home' },
      { source: '/user', destination: '/home' },
      { source: '/projects', destination: '/youtube/projects' },
      { source: '/projects/:path*', destination: '/youtube/projects/:path*' },
      ...platforms.flatMap((platform) => [
        { source: `/${platform}/posts`, destination: '/youtube/videos' },
        { source: `/${platform}`, destination: '/youtube' },
        { source: `/${platform}/:path*`, destination: '/youtube/:path*' },
      ]),
    ];
  },
};

export default nextConfig;
