import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  output: "standalone",
};

const agentOrigin = process.env.EVE_NEXT_PRODUCTION_ORIGIN?.replace(/\/$/, "");

export default agentOrigin
  ? {
      ...nextConfig,
      async rewrites() {
        return [
          {
            source: "/eve/v1",
            destination: `${agentOrigin}/eve/v1`,
          },
          {
            source: "/eve/v1/:path*",
            destination: `${agentOrigin}/eve/v1/:path*`,
          },
        ];
      },
    }
  : withEve(nextConfig);
