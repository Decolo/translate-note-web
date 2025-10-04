# Translation App

A full-stack translation web app built with Next.js, TypeScript, and Supabase. Translate text between languages and save your favorite translations to a database.

## Features

- 🌍 Translate between 12+ languages using LibreTranslate API
- 💾 Save translation pairs to Supabase database
- 📝 View and manage saved translations
- 🎨 Clean, responsive UI with Tailwind CSS
- ⚡ Built with Next.js 15 App Router

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Translation API**: LibreTranslate (free, open-source)

## Setup Instructions

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to SQL Editor and run the SQL from `supabase-schema.sql`
4. Go to Settings > API to get your project credentials:
   - Project URL
   - Anon/Public key

### 2. Environment Variables

Create `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
translation-app/
├── app/
│   ├── api/
│   │   ├── translate/    # Translation API route
│   │   └── notes/        # CRUD operations for saved translations
│   └── page.tsx          # Main UI component
├── lib/
│   ├── supabase.ts       # Supabase client configuration
│   └── translator.ts     # Translation service
├── supabase-schema.sql   # Database schema
└── .env.local            # Environment variables (not committed)
```

## Database Schema

The app uses a single `translations` table:

- `id`: UUID primary key
- `source_text`: Original text
- `translated_text`: Translated text
- `source_lang`: Source language code
- `target_lang`: Target language code
- `created_at`: Timestamp

## Supported Languages

English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi

## API Routes

- `POST /api/translate` - Translate text
- `GET /api/notes` - Fetch all saved translations
- `POST /api/notes` - Save a translation
- `DELETE /api/notes?id=<id>` - Delete a translation

## Deployment

Deploy to Vercel with one click:

```bash
npm run build
vercel deploy
```

Don't forget to add environment variables in Vercel dashboard!

## License

MIT
