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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Neon / Server Action example

This repo includes a small example Server Action that writes a `comment` into Postgres via the `@neondatabase/serverless` driver.

- Page: `app/neon-example/page.tsx`
- Requirements: set `DATABASE_URL` or `POSTGRES_URL` in your environment (or Vercel envs)
- Create table (Neon SQL editor):

```sql
CREATE TABLE IF NOT EXISTS comments (comment TEXT);
```

- Run locally:
```bash
npm install
export $(grep -v '^#' .env.local | xargs)
npm run dev
# then open http://localhost:3000/neon-example
```

## Prisma / Postgres

This project now uses Prisma as ORM and expects a Postgres database for persistence.

- Ensure `LICITACOES__POSTGRES_URL` is set in `.env.local`.
- Install dependencies: `npm install`.
- Generate Prisma client: `npm run prisma:generate`.
- Apply migrations or push schema: `npm run prisma:migrate` (or `npx prisma db push`).

Vercel deployment notes

- In the Vercel project settings add the environment variable `LICITACOES__POSTGRES_URL` (and any other needed vars) in both Preview and Production (and optionally Development) scopes.
- Use this Build Command on Vercel:

```bash
npm run vercel-build
```

This ensures `prisma generate` runs before `next build` and the generated client is available at build/runtime.

- Migrations: for production you should run migrations against the production DB before or during deployment. Options:
	- Use `prisma migrate deploy` from a CI step (recommended) against the production DB.
	- Or run `npx prisma db push` to push the schema (less safe for production).

Example minimal Vercel env vars to set (copy values from your `.env.local`):

- `LICITACOES__POSTGRES_URL`
- `LICITACOES__POSTGRES_PRISMA_URL` (optional)
- Any API keys (e.g. `GOOGLE_API_KEY`, Supabase keys) used by your app

After these are set, deploy on Vercel normally — the build will generate Prisma client and Next build will succeed.
