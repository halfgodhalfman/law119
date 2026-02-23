# ChinaLegal (华法网)

## Setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local` and fill values.
3. Install dependencies:
   - `npm install`
4. Generate Prisma client:
   - `npx prisma generate`
5. Run Prisma migration:
   - `npx prisma migrate dev --name init`
6. Start dev server:
   - `npm run dev`

## Included Features

- Client multi-step case posting form (`react-hook-form` + `zod` + i18n).
- Attorney dashboard with matching + filters/sorting.
- Anonymous chat flow with disclaimer gate.
- Supabase-authenticated identity resolution (no profile ids in URL).
- Email notification integration via Resend (`RESEND_API_KEY` and `RESEND_FROM_EMAIL`).
- Supabase RLS policy draft at `supabase/rls.sql`.
