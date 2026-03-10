# Soma — Product Requirements Document

> Version 1.0 — Current build

---

## Problem Statement

People who care about their health are managing too many disconnected tools. A fitness tracker here, a nutrition app there, class bookings buried in email. None of it talks to each other. None of it adapts.

The result is that staying on top of your health requires constant manual effort — and the moment life gets busy, the system falls apart. Most health apps optimise for data collection, not for helping you make better decisions with that data.

Soma is built around a different premise: **the goal is insight, not logging.**

---

## Target User

**Primary:** Health-conscious professionals aged 25–40 who already exercise regularly and think about nutrition, but want to optimise rather than just track. They have limited time, high standards, and treat their health as a performance input, not a hobby.

**They are not:** Beginners trying to form basic habits. Users who need step-by-step coaching. People motivated by streaks and badges.

**Key behaviours:**
- Already use Strava or attend gym classes
- Think in terms of macros, not just calories
- Make food and training decisions deliberately
- Find manual data entry acceptable only if the payoff is clear

---

## Goals

1. Reduce the friction of daily health tracking to the point where consistency becomes the default
2. Give users one unified view of their nutrition, training, and goals
3. Make the AI coach genuinely useful — context-aware, not generic
4. Surface location-aware recommendations that translate goals into real-world action

---

## Features

### 1. AI Coach (Chat)
A conversational interface with full access to the user's goals, meals, workouts, and persistent memory. Responds in natural language. Supports voice input and image uploads. Streams responses in real time.

**Must have:**
- Full context window including today's meals, recent workouts, and stated goals
- Persistent memory of user preferences and patterns (`agent_memory` table)
- Image understanding (food photos, workout screenshots)
- Voice input on mobile

**Out of scope for v1:**
- Proactive push notifications from the coach
- Multi-turn tool use (e.g. "log this meal" triggered from chat)

---

### 2. Meal Logging
Users describe a meal in plain language or photograph it. The AI estimates macros and logs the entry.

**Must have:**
- Text description → macro estimation (calories, protein, carbs, fats, fiber)
- Photo → macro estimation (same fields)
- Ability to edit estimates before saving
- Today / Weekly / Monthly views with macro totals

**Estimation quality bar:**
- Calibrated to realistic portion sizes (cooked weights, not raw)
- Restaurant meals default to higher-end estimates (oils, sauces)
- Protein × 4 + carbs × 4 + fats × 9 must cross-check against total calories ±5%

---

### 3. Workout Tracking
Workouts are logged automatically via integrations or manually. Calorie burn is estimated from activity type and duration.

**Must have:**
- Manual workout entry (name, type, duration)
- Strava sync (OAuth, activity pull, calorie estimation for activities without HR data)
- Gmail sync (detect class booking confirmations, create timeline events)
- Calorie burn estimation per activity type — not pulled from device sensors

**Activity types supported:**
- Running, cycling, swimming, strength, HIIT, yoga, pilates, rowing, CrossFit, boxing, hiking, walking

---

### 4. Ideas Tab
Location-aware restaurant and fitness venue recommendations, explained by the AI in terms of the user's goals.

**Must have:**
- Location permission flow (idle → requesting → granted/denied)
- Google Maps embed with dark styling
- Nearby restaurant search (Google Places API New, `searchNearby`)
- Nearby gym/studio search
- AI-generated insight panel: overall context + per-place explanation
- Filters: cuisine type, goal alignment (meals); venue type, intensity (activity)
- PlaceCard with rank, rating, price level, type badge, AI explanation

---

### 5. Dashboard
Daily snapshot of progress toward goals, with quick entry points to the key flows.

**Must have:**
- Daily score (macro and workout goal alignment)
- Macro progress tiles (calories, protein, carbs, fats)
- Quick actions: Log Meal, Log Workout, Ideas
- Chat accessible from the dashboard
- Recent conversation list

---

### 6. Profile & Goals
Users set their targets and connect integrations.

**Must have:**
- Display name, avatar, timezone
- Goal setting: target calories, macros, body weight, exercise frequency
- Dietary and workout preferences
- Strava OAuth connect/disconnect
- Gmail OAuth connect/disconnect

---

## Non-Goals (v1)

- Native iOS / Android apps
- Social features, sharing, or community
- Wearable hardware integrations (Oura, Whoop, Apple Watch) — planned for v2
- Subscription or payment flow
- Personalised meal plan generation — planned for v2

---

## Constraints

- **Privacy:** No health data is shared with third parties. All data lives in user-owned Supabase projects. AI prompts do not include PII beyond what the user explicitly provides.
- **Reliability:** AI features degrade gracefully. If macro estimation fails, the user can enter values manually. If the chat function is unavailable, the rest of the app works normally.
- **Performance:** Chat streams in real time via SSE. Map and Places results load within 3 seconds on a standard mobile connection.

---

## Success Criteria

The v1 build is successful when:
- A new user can complete their first meal log and first workout log within 10 minutes of signing up
- The AI coach gives a response that references the user's actual data (not generic advice) on the first query
- The Ideas tab surfaces relevant, location-accurate results within 5 seconds of granting location permission
