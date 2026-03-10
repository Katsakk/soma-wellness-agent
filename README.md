# Soma — Adaptive Wellness Intelligence

> An AI-powered personal wellness agent that learns your body, your schedule, and your goals — and gives you one clear picture of your health every day.

**Live:** [soma-wellness-agent.vercel.app](https://soma-wellness-agent.vercel.app/)

---

## The Problem

Most people trying to improve their health are working with fragmented data and generic advice.

Your fitness tracker counts steps. Your nutrition app logs calories. Your gym sends booking confirmations. Your coach gives static meal plans. None of these talk to each other — and none of them adapt to what actually happened today.

The result: people either over-invest in manual tracking (logging every gram of food, entering every workout) and burn out, or they rely on one-size-fits-all plans that don't reflect their real life. Neither works long-term.

---

## Target User

Soma is built for the **health-conscious professional** — someone who:

- Already exercises and thinks about nutrition, but wants to optimise, not just track
- Has limited time and high standards; friction is the enemy of consistency
- Uses multiple tools (gym apps, running trackers, food photos) but lacks a unified view
- Wants intelligence, not just data — "what should I do today?" not just "here's what you did"

This is not a beginner calorie counter. It's a personal performance layer for people who already have the habit but want sharper insight.

---

## Product Vision

**One agent that knows your whole health picture.**

Soma connects your meals, workouts, energy, and goals into a single adaptive coach. Instead of switching between five apps and interpreting data yourself, you ask Soma — and it answers with full context: what you ate, how you trained, what your goals are, and what's nearby that fits your plan.

The long-term vision is a wellness agent that proactively surfaces insights, adapts recommendations as your data changes, and reduces the cognitive load of staying healthy.

---

## Core Features

### AI Coach with Full Context
A conversational AI (powered by Gemini) that has access to your goals, today's meals, recent workouts, and persistent memory of your preferences. Ask anything: "Am I hitting my protein target this week?", "What should I eat before my run tomorrow?", "How do I adjust my training if I only slept 5 hours?" — and get answers grounded in your actual data, not generic advice.

### Intelligent Meal Logging
Describe your meal in plain language or take a photo. Soma estimates calories, protein, carbs, fats, and fiber using AI — calibrated to realistic portions and restaurant-style hidden calories. No barcode scanning, no database lookups, no manual gram entry.

### Automatic Workout Sync
Workouts flow in automatically from Strava. Class bookings are detected from Gmail confirmation emails. Manual logging is supported too. Calorie burn is estimated per activity type and duration — not pulled from inaccurate device sensors.

### Ideas Tab — Location-Aware Recommendations
Share your location and Soma surfaces nearby restaurants and fitness studios tailored to your current goals. A quick AI overlay explains why each place fits your plan today: "High-protein options match your 40g remaining protein target" or "This studio's HIIT classes align with your 4x/week cardio goal." Filtered by cuisine, venue type, and goal alignment.

### Daily Snapshot Dashboard
Every day starts with a score — a single metric reflecting how aligned your food and training are with your goals. Quick actions surface the most relevant next step. The chat is always one tap away.

### Calendar & Timeline
A full view of past and upcoming activity: workouts logged, meals eaten, classes booked. Events sourced automatically from integrations and displayed chronologically.

---

## Design Philosophy

Soma is built to feel like a premium health tool, not a consumer fitness app.

**Dark-first, data-forward.** The interface uses a deep charcoal palette (inspired by Oura and Rise) with high-contrast metric tiles. Data should be readable at a glance without visual noise.

**Calm, not gamified.** No streaks, no badges, no push notifications begging for engagement. The product earns daily use through genuine utility.

**Mobile-first, desktop-capable.** The primary surface is a mobile web app with a bottom tab nav. The same layout scales to desktop with a sidebar.

**Friction as the enemy.** Every logging flow is designed to require the minimum possible input. The AI does the estimation work; the user confirms or adjusts.

---

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| **Supabase** over a custom backend | Instant auth, Postgres, and serverless functions in one platform. Eliminates an entire infrastructure layer for an early-stage product. |
| **Gemini 2.0 Flash** over GPT-4 | Cost-performance ratio for high-frequency requests (every meal log, every chat message). Gemini's multimodal capability handles food photo analysis natively. |
| **OpenAI-compatible endpoint** for Gemini | Allows the edge functions to be model-agnostic. Swapping to a different model is a one-line change. |
| **Server-Sent Events (SSE)** for chat streaming | Users see the AI response character-by-character rather than waiting for a full response. Critical for perceived responsiveness in a chat interface. |
| **Google Maps Places API (New)** | `Place.searchNearby` with async dynamic library loading — avoids deprecated `PlacesService`, supports the full new Places data model. |
| **Edge Functions over a Node API** | Zero-config deployment, global edge distribution, no cold-start management. Each AI feature (macros, chat, workout estimation, ideas) is an isolated function. |
| **Client-side data fetching** | No intermediate API layer. The React frontend queries Supabase directly via `supabase-js`. Simplifies the stack significantly for a single-developer product. |
| **Vercel for frontend** | Git-push deploys, global CDN, zero config for a Vite SPA. |

---

## What's Next

- **Oura Ring integration** — resting heart rate, HRV, and sleep score piped into the AI coach context
- **Adaptive goal recalibration** — goals that update automatically based on training load and trend data
- **Proactive nudges** — AI-initiated check-ins when patterns suggest under-recovery or goal drift
- **Meal plan generation** — weekly meal scaffolding based on macro targets and food preferences
- **Progress photos** — body composition tracking with AI-assisted trend analysis

---

## Docs

Full product documentation lives in [`/docs`](./docs/):

- [`IDEAS_TAB_PRD.md`](./docs/IDEAS_TAB_PRD.md) — Ideas tab product requirements
- [`DESIGN.md`](./docs/DESIGN.md) — Visual design system and component patterns

---

*For technical setup, environment variables, and deployment instructions, see the [developer guide](./docs/DEVELOPER.md).*
