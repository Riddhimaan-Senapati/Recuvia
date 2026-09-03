/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns = supabaseUrl
  ? (() => {
      const url = new URL(supabaseUrl);
      return [
        {
          protocol: url.protocol.replace(":", ""),
          hostname: url.hostname,
          ...(url.port ? { port: url.port } : {}),
        },
      ];
    })()
  : [];

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns,
  },
  serverExternalPackages: ["@xenova/transformers"],
};

module.exports = nextConfig;
