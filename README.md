# Nexus Global Franchise

Independent marketplace MVP built with Next.js, Supabase and Tailwind CSS.

## Setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Copy `.env.example` to `.env.local` and enter your project URL and publishable/anon key.
4. Run `npm install` then `npm run dev`.
5. Visit http://localhost:3000.

## Deploy
Push to GitHub, import the repository into Vercel, and configure the same environment variables. Configure Supabase Auth URL settings to your production domain. Email confirmation may be required before sign-in.

## Security
Never commit `.env.local` or Supabase service_role/secret keys. Row Level Security policies enforce ownership. New listings start as drafts and require publication by the owner; moderation should be added before a public launch.
