# Linked Lead AI

Linked Lead AI is a local-first AI CRM for managing job, recruiter, freelance, client, and partnership opportunities. It helps you paste lead content, analyze fit with AI, generate outreach, track follow-ups, schedule reminders, and create platform-specific content.

## Features

- Lead CRM with dashboard, lead list, detail pages, and pipeline stages.
- AI lead analysis for scoring, trust checks, pitch angles, next actions, and generated messages.
- CV Coach that compares your saved CV against a role without inventing experience.
- Project/portfolio storage so AI can suggest the best project to mention.
- Follow-up tracking with date and time reminders.
- Telegram reminders for tasks, follow-ups, scheduled content, and high-score lead alerts.
- Telegram bot commands:
  - `/today`
  - `/leads`
  - `/followups`
  - `/post x topic`
  - `/done task_id`
- Content Studio for LinkedIn, X/Twitter, Medium, blogs, newsletters, Dev.to, Facebook, and Instagram.
- Neon snapshot sync through the backend.
- Browser `localStorage` fallback for local/offline usage.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Node.js backend using built-in HTTP server
- Neon serverless driver
- Anthropic Claude, Groq, and Gemini provider support
- Telegram Bot API

## Install

```bash
npm install
```

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

## Environment

Frontend AI config:

```bash
VITE_AI_PROVIDER=anthropic
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
VITE_ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
VITE_ENABLE_GROQ_FALLBACK=true
VITE_TELEGRAM_API_URL=/api
```

Optional Groq fallback:

```bash
VITE_GROQ_API_KEY=your_groq_api_key_here
VITE_GROQ_MODEL=llama-3.3-70b-versatile
```

Set this if you do not want Groq fallback calls:

```bash
VITE_ENABLE_GROQ_FALLBACK=false
```

Backend config:

```bash
DATABASE_URL=your_neon_database_url_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_PORT=8787
TELEGRAM_DATA_FILE=./data/telegram-store.json
```

Server-side AI for Telegram `/post` commands:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Restart `npm run dev` after changing any `VITE_*` variable.

## Run

For local development, start the backend:

```bash
npm run server
```

Start the frontend:

```bash
npm run dev
```

Open the Vite URL shown in the terminal.

On Vercel, the backend runs from the `api/` Vercel Functions. You do not run `npm run server` in production.

## Neon Storage

The app writes to Neon only through the backend. The browser does not connect directly to Neon.

Production backend endpoints are deployed as Vercel Functions:

- `/api/health`
- `/api/app/state`
- `/api/telegram/status`
- `/api/telegram/sync`
- `/api/telegram/test`
- `/api/telegram/webhook`
- `/api/telegram/reminders`

When `DATABASE_URL` is configured, the backend creates this table:

```sql
create table if not exists app_snapshots (
  user_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
```

Each user gets one row. The `data` JSONB snapshot contains:

- profile
- projects
- leads
- generated messages
- interactions
- daily tasks
- content reminders
- Telegram settings and connection info
- sent-reminder history
- Telegram command task completions

To push existing browser data to Neon:

1. Run `npm run server`.
2. Run `npm run dev`.
3. Open Settings.
4. Go to Database Sync.
5. Click Sync Now.

If Neon is empty, check:

- `DATABASE_URL` is set in Vercel project environment variables for Production.
- The latest Vercel deployment happened after adding the `api/` routes.
- Settings > Database Sync says `Neon configured`.
- You clicked Sync Now or changed CRM data after the backend started.

For local development, `DATABASE_URL` must also be set in `.env`, and `npm run server` must be running.

## Telegram Setup

1. Create a Telegram bot with BotFather.
2. Put the token in `.env`:

```bash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

3. For local development, start the backend:

```bash
npm run server
```

4. Open Settings > Telegram Reminders.
5. Click Connect Telegram, or send the displayed `/start user_<id>` command to your bot.
6. Click Refresh Status.
7. Click Send Test.

For the deployed Vercel app, set the Telegram webhook to the production URL:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://leadai-self.vercel.app/api/telegram/webhook"
```

The app also includes `vercel.json` with a scheduled call to `/api/telegram/reminders` for due reminders. The default schedule is daily:

```json
{
  "path": "/api/telegram/reminders",
  "schedule": "0 9 * * *"
}
```

For near-real-time reminders, use a Vercel plan that supports more frequent cron schedules and change the schedule to:

```json
{
  "path": "/api/telegram/reminders",
  "schedule": "* * * * *"
}
```

On Vercel Hobby, frequent cron schedules can fail deployment because Hobby cron is limited to daily schedules. Another option is an external scheduler that calls:

```text
https://leadai-self.vercel.app/api/telegram/reminders
```

Required Vercel environment variables:

```bash
DATABASE_URL
TELEGRAM_BOT_TOKEN
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
GROQ_API_KEY
GROQ_MODEL
GEMINI_API_KEY
GEMINI_MODEL
VITE_AI_PROVIDER
VITE_ANTHROPIC_API_KEY
VITE_ANTHROPIC_MODEL
VITE_ENABLE_GROQ_FALLBACK
VITE_GROQ_API_KEY
VITE_GROQ_MODEL
VITE_TELEGRAM_API_URL
```

At minimum for production database sync:

```bash
DATABASE_URL
VITE_TELEGRAM_API_URL=/api
```

At minimum for Telegram:

```bash
DATABASE_URL
TELEGRAM_BOT_TOKEN
VITE_TELEGRAM_API_URL=/api
```

Telegram reminders include:

- pending daily tasks
- lead follow-ups
- scheduled content reminders
- high-score lead alerts

## AI Provider Behavior

`VITE_AI_PROVIDER=anthropic` means Claude is primary.

If Claude fails and `VITE_ENABLE_GROQ_FALLBACK=true`, the app tries Groq. If Groq is rate-limited, you may see a Groq `429` error even though Claude is primary. To stop fallback calls:

```bash
VITE_ENABLE_GROQ_FALLBACK=false
```

Common Groq rate-limit error:

```text
Groq API error: 429
```

That means the fallback provider was called and its token-per-minute quota was exceeded.

## Scripts

```bash
npm run dev      # Vite frontend
npm run server   # local backend for Neon + Telegram
npm run build    # production frontend build
npm run preview  # preview production build
```

## Verification

```bash
./node_modules/.bin/tsc --noEmit
npm run build
node --check server/index.js
```

## Current Architecture Notes

The frontend remains local-first and stores data in browser `localStorage`. The backend receives synced snapshots and persists them to Neon when configured. This is simpler than a normalized multi-table backend, but it means Neon currently stores full user snapshots rather than separate lead/task/message tables.

For a production SaaS version, the next step would be replacing the snapshot table with normalized tables and moving all AI provider calls fully server-side so API keys are never exposed to the browser.
