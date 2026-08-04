This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Docker

Generated Shopify apps are containerized and deployed to Fly.io. The `Dockerfile` used for each generated project (see `src/lib/deploy.ts`) is a two-stage build:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "run", "start"]
```

Deployment is handled automatically by `deployProject()` in `src/lib/deploy.ts`, which:

1. Materializes the generated project files into a temp directory.
2. Writes the `Dockerfile` and a generated `fly.toml` alongside them.
3. Creates (or reuses) a Fly.io app and a per-project Postgres database on the shared Fly Postgres cluster.
4. Sets app secrets (including `DATABASE_URL`) via `flyctl secrets set`.
5. Runs `flyctl deploy --remote-only --yes`, which builds the Docker image remotely on Fly's builders — no local Docker daemon is required.

Requires the following environment variables to be configured on the server:

- `FLY_API_TOKEN`
- `FLY_ORG`
- `FLY_POSTGRES_HOST`
- `FLY_POSTGRES_PASSWORD`
- `FLY_POSTGRES_APP`
- `FLY_REGION` (optional, defaults to `iad`)
- `FLYCTL_PATH` (optional, defaults to `flyctl` on `PATH`)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
