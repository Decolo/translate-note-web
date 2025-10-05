# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the App Router UI and server routes; `app/page.tsx` renders the translator, and `app/api/trpc/[trpc]/route.ts` binds the tRPC entrypoint.
- `lib/` holds shared services: Supabase client (`lib/supabase.ts`), translation providers (`lib/translator.ts`), tRPC routers, and auth helpers.
- `public/` serves static assets, while `supabase-schema.sql` provisions database tables for translations, users, and sessions.

## Build, Test, and Development Commands
- `npm run dev` launches the Turbopack dev server with live reload.
- `npm run build` compiles a production bundle; run it before deployment or major merges.
- `npm run start` hosts the compiled build for smoke-testing the production profile.
- `npm run lint` enforces the flat ESLint config (`next/core-web-vitals`, TypeScript) and should pass before pushing.

## Coding Style & Naming Conventions
- Strict TypeScript: prefer the `@/*` alias for internal imports and keep tRPC procedures typed with `zod` schemas.
- Use two-space indentation, single quotes in TS/TSX, and order Tailwind classes logically (layout → spacing → color).
- Components are PascalCase, hooks use camelCase `useX` names, and environment constants stay in SCREAMING_SNAKE_CASE.

## Testing Guidelines
- Automated tests are not yet wired; document manual coverage of translate, save, and delete paths in every PR.
- When adding non-trivial logic, create focused unit or integration tests under `app/__tests__` or `lib/__tests__`, and add the invocation to `package.json`.
- Re-run `npm run lint` after test additions to ensure type safety against Supabase schemas.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) as seen in history; keep subjects concise and scoped to one concern.
- Bundle related work per commit and highlight Supabase schema alterations separately from UI tweaks.
- PRs should include a short summary, linked task or issue, UI screenshots for visual changes, executed command checklist, and any new env variables reviewers must set.

## Security & Configuration Tips
- Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; never commit secrets.
- Optional providers expect `DEEPSEEK_API_KEY` or `GEMINI_API_KEY`; degrade gracefully when absent.
- Avoid logging payloads in server code—log error metadata only to prevent leaking tokens.
