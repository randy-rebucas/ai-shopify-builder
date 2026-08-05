import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma Client is generated to a custom path (prisma/schema.prisma's `output`, see
  // src/generated/prisma) instead of the default node_modules/.prisma/client. Vercel's serverless
  // build traces each route's dependencies via static analysis to decide what to bundle, and a
  // custom Prisma output location falls outside what it detects automatically — the build succeeds
  // and the app works locally (full filesystem), but every route that imports @/lib/db (basically
  // all of them) 500s on Vercel because the generated client/engine files were pruned from the
  // deployed function. Every route can touch the database, so include it for all of them.
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
