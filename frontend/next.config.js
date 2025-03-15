/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent webpack from processing Node.js modules
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
      
      // Add a rule to ignore HTML files in node_modules
      config.module.rules.push({
        test: /\.html$/,
        include: /node_modules/,
        use: 'null-loader',
      });
    }
    return config;
  },
};

module.exports = nextConfig;