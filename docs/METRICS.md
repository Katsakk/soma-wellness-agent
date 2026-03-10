# Soma — Metrics

> How we know the product is working.

---

## North Star

**Weekly Active Users who log at least 3 meals and 1 workout in the same week.**

This captures the core value loop: Soma is only useful if it has data to reason about. A user who tracks consistently is a user who gets real value from the AI coach. Everything else is downstream of this.

---

## Engagement

| Metric | Description |
|---|---|
| **Daily Active Users (DAU)** | Users who open the app at least once |
| **Meal logs per user per week** | Target: 3+ (breakfast, lunch, dinner pattern) |
| **Workout logs per user per week** | Target: 2+ (manual or via Strava/Gmail sync) |
| **AI chat messages per active user** | Proxy for depth of engagement with the coach |
| **Ideas tab opens per session** | Signals intent to act, not just review |

---

## Retention

| Metric | Description |
|---|---|
| **Day 7 retention** | % of new users still active after one week |
| **Day 30 retention** | Core retention signal; target: >40% |
| **Integration connection rate** | % of users who connect Strava or Gmail; correlated with long-term retention |
| **Return-to-chat rate** | % of users who use AI chat more than once |

---

## Health Outcomes (Qualitative, Phase 2)

Once sufficient longitudinal data exists:

- % of users hitting their weekly calorie target (±10%)
- % of users hitting their weekly protein target
- Trend in goal attainment over 30/60/90 day windows
- Self-reported satisfaction with recommendations (thumbs up/down on AI coach responses)

---

## Anti-Metrics

These would signal the product is working against users, not for them:

- **High DAU with low meal log rate** — users are opening the app but not getting value from it
- **High chat volume with no logging** — the AI has no real data to work with; responses become generic
- **Integration disconnect rate** — users removing Strava/Gmail connections after connecting them

---

## Current Baseline

Product is in early access. No baseline established yet. First milestone: 10 users completing the full onboarding-to-logging loop within their first 48 hours.
