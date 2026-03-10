# Soma Wellness Agent

A premium AI-powered personal wellness app that tracks nutrition, workouts, and activity — with a conversational AI coach, location-aware recommendations, and third-party integrations.

---

## Overview

Soma is a dark-themed mobile-first web app that helps users:

- **Log meals** with AI macro estimation (describe or photograph your food)
- **Track workouts** manually or synced from Strava and Gmail booking confirmations
- **Chat with an AI coach** that has full context of your goals, meals, and activity
- **Discover nearby restaurants and fitness venues** tailored to your nutritional and training goals
- **View a calendar** of past and upcoming sessions pulled from connected integrations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| Routing | React Router DOM v6 |
| Data fetching | TanStack React Query |
| Backend / DB | Supabase (Postgres + Auth + Edge Functions) |
| AI | Google Gemini 2.0 Flash via OpenAI-compatible API |
| Maps | Google Maps JavaScript API + Places API (New) |
| Deployment | Vercel |
| Testing | Vitest + Testing Library |

---

## Architecture

```
soma-wellness-agent/
├── src/
│   ├── App.tsx                        # Router + providers
│   ├── pages/
│   │   ├── Index.tsx                  # Dashboard
│   │   ├── Meals.tsx                  # Food logging
│   │   ├── ActivityPage.tsx           # Workout tracking
│   │   ├── CalendarPage.tsx           # Timeline / calendar
│   │   ├── IdeasPage.tsx              # Location-aware recommendations
│   │   ├── Profile.tsx                # Goals, preferences, integrations
│   │   └── Auth.tsx                   # Login / sign-up
│   ├── components/
│   │   ├── AppLayout.tsx              # Shell with mobile bottom nav + desktop side nav
│   │   ├── ChatInterface.tsx          # Streaming AI chat (voice, images, SSE)
│   │   ├── meals/                     # Meal-specific components
│   │   ├── activity/                  # Workout-specific components
│   │   ├── chat/                      # Chat sub-components
│   │   ├── profile/                   # Profile dialogs
│   │   └── ui/                        # shadcn/ui primitives
│   ├── contexts/
│   │   └── AuthContext.tsx            # Supabase auth state
│   ├── hooks/                         # useConversations, useVoiceRecording, etc.
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts              # Supabase client singleton
│   │       └── types.ts               # Auto-generated DB types
│   └── lib/
│       ├── streamChat.ts              # SSE streaming client
│       └── imageUtils.ts             # Base64 image compression
│
├── supabase/
│   ├── config.toml                    # Project + function config
│   └── functions/
│       ├── chat/                      # Streaming AI coach (Gemini, SSE)
│       ├── estimate-macros/           # AI macro estimation from text or image
│       ├── estimate-workout/          # AI calorie estimation for workouts
│       ├── ideas-insight/             # AI insight for nearby places
│       ├── strava-auth/               # Strava OAuth initiation
│       ├── strava-callback/           # Strava OAuth callback + token storage
│       ├── strava-sync/               # Sync Strava activities to workouts table
│       ├── gmail-auth/                # Gmail OAuth initiation
│       ├── gmail-callback/            # Gmail OAuth callback + token storage
│       └── gmail-sync/               # Parse Gmail for class/workout bookings
│
└── vercel.json                        # SPA catch-all rewrite rule
```

### Data flow

- **Auth**: Supabase Auth (email/password). `AuthContext` wraps the app; `ProtectedRoute` guards all main pages.
- **Data**: All reads/writes go directly from the React client to Supabase Postgres via `@supabase/supabase-js`. No separate API layer.
- **AI chat**: Frontend calls the `chat` Edge Function, which streams an SSE response using Gemini. Each chunk is rendered in real time. Messages are persisted to `chat_messages` after the stream ends.
- **Macro estimation**: Frontend calls `estimate-macros` with a text description and/or base64 image. Gemini returns structured JSON via function calling.
- **Ideas tab**: Browser Geolocation API → Google Maps Places API (New) `Place.searchNearby` → results passed to `ideas-insight` Edge Function → Gemini generates personalised insight and per-place explanations.
- **Integrations**: Strava and Gmail use OAuth 2.0. Tokens are stored in the `integrations` table. Sync functions pull activity data and write to `workouts` and `timeline_events`.

### Database tables

| Table | Purpose |
|---|---|
| `profiles` | Display name, avatar, timezone |
| `goals` | Target calories, macros, body stats, exercise frequency |
| `preferences` | Dietary and workout preferences, units |
| `meals` | Meal logs (name, calories, macros, meal_time, source) |
| `workouts` | Workout logs (name, type, duration, calories_burned, exercises JSON) |
| `chat_conversations` | Conversation threads |
| `chat_messages` | Per-message storage (role, content, images) |
| `agent_memory` | Persistent facts the AI remembers per user |
| `integrations` | OAuth tokens for Strava, Gmail |
| `timeline_events` | Calendar events from integrations |
| `user_roles` | Admin / user roles |

---

## Running Locally

### Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)

### 1. Clone and install

```bash
git clone https://github.com/Katsakk/soma-wellness-agent.git
cd soma-wellness-agent
npm install
```

### 2. Set environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
```

### 3. Start the dev server

```bash
npm run dev
```

The app runs at `http://localhost:8080`.

---

## Environment Variables

### Frontend (`.env`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase `anon` public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key — requires **Maps JavaScript API** and **Places API (New)** enabled in Google Cloud Console |

### Edge Functions (Supabase Secrets)

Set these in the Supabase dashboard under **Project Settings → Edge Functions → Secrets**, or via CLI:

```bash
supabase secrets set GOOGLE_AI_API_KEY=<value>
```

| Secret | Description |
|---|---|
| `GOOGLE_AI_API_KEY` | Google AI Studio key for Gemini (all AI features) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Gmail integration) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (Gmail integration) |
| `STRAVA_CLIENT_ID` | Strava OAuth app client ID |
| `STRAVA_CLIENT_SECRET` | Strava OAuth app client secret |
| `SUPABASE_URL` | Auto-provided by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase runtime |

---

## Deploying Edge Functions

```bash
supabase functions deploy chat
supabase functions deploy estimate-macros
supabase functions deploy estimate-workout
supabase functions deploy ideas-insight
supabase functions deploy strava-auth
supabase functions deploy strava-callback
supabase functions deploy strava-sync
supabase functions deploy gmail-auth
supabase functions deploy gmail-callback
supabase functions deploy gmail-sync
```

---

## Deployment (Vercel)

The app is deployed on Vercel. `vercel.json` contains a catch-all rewrite so React Router handles all client-side routes:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Steps

1. Push to `main` — Vercel auto-deploys if the GitHub repo is connected.
2. Or deploy manually: `npx vercel --prod`
3. Add the four `VITE_*` variables in **Vercel → Project → Settings → Environment Variables**.

> Supabase Edge Function secrets are managed entirely within Supabase and do not need to be added to Vercel.

---

## Key Scripts

```bash
npm run dev        # Start local dev server (port 8080)
npm run build      # Production build
npm run preview    # Preview production build locally
npm run test       # Run unit tests (Vitest)
npm run lint       # ESLint
```
