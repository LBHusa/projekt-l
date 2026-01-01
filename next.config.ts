import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Alte URLs -> Neue URLs (Faction Restructure)
      {
        source: '/gesundheit',
        destination: '/koerper',
        permanent: true,
      },
      {
        source: '/lernen',
        destination: '/weisheit',
        permanent: true,
      },
      {
        source: '/familie',
        destination: '/soziales',
        permanent: true,
      },
      {
        source: '/freunde',
        destination: '/soziales',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
