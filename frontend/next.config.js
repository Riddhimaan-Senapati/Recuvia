/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude problematic node_modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        child_process: false,
        net: false,
        tls: false,
      };

      // Add HTML loader with explicit exclusion
      config.module.rules.push({
        test: /\.html$/,
        include: /node_modules\/@mapbox\/node-pre-gyp/,
        use: 'null-loader',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
