/** @type {import('next').NextConfig} */
const nextConfig = {
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
  serverExternalPackages: ["@zilliz/milvus2-sdk-node"],
	outputFileTracingIncludes: {
			// When deploying to Vercel, the following configuration is required
			"/api/**/*": ["node_modules/@zilliz/milvus2-sdk-node/dist/proto/**/*"],
		},
};

module.exports = nextConfig;