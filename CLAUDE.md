# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack translation web app built with Next.js 15, TypeScript, and Supabase. The app allows users to translate text between 12+ languages using multiple translation providers (Google Translate, DeepSeek, Gemini, MyMemory, Lingva) and save translations to a Supabase database.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture

### tRPC Integration

The project uses **tRPC** for end-to-end type-safe API communication:

- **Server-side router** (`lib/server.ts`): Defines all API procedures using Zod for input validation
  - `translateRouter`: Handles translation requests
  - `notesRouter`: Manages CRUD operations for saved translations
  - Exports `appRouter` and `AppRouter` type for client consumption

- **Client setup** (`lib/client.ts`): Creates typed tRPC React hooks using `createTRPCReact<AppRouter>`

- **API endpoint** (`app/api/trpc/[trpc]/route.ts`): Catch-all route handler that processes tRPC requests

- **Provider wrapper** (`app/providers.tsx`): Client component that wraps the app with tRPC and React Query providers

### Translation System

The translation service (`lib/translator.ts`) implements a provider pattern with 5 different translation APIs:

1. **googletranslate** (default): Free, no API key required
2. **deepseek**: LLM-based translation, requires `DEEPSEEK_API_KEY` environment variable
3. **gemini**: LLM-based translation, requires `GEMINI_API_KEY` environment variable
4. **mymemory**: Free API with 500 requests/day limit
5. **lingva**: Free proxy service

Each provider has its own implementation function that handles API-specific request formatting and error handling.

### Database

Supabase PostgreSQL with a single `translations` table:
- Schema located in `supabase-schema.sql`
- Client initialized in `lib/supabase.ts` using environment variables
- RLS enabled with permissive policy (should be secured with auth)

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Optional (for LLM translation providers):

```
DEEPSEEK_API_KEY=your_deepseek_api_key
GEMINI_API_KEY=your_gemini_api_key
```

## Path Aliases

TypeScript paths configured in `tsconfig.json`:
- `@/*` maps to project root

## Key Constraints

- Maximum file size: 200 lines for TypeScript files (as per global CLAUDE.md)
- Next.js 15 App Router structure
- Server components by default; client components marked with `'use client'`
- All API logic goes through tRPC procedures, not traditional Next.js API routes
