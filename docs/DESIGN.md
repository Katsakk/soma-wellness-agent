# Soma — Design System

> The visual and interaction language for the product. All UI decisions should reference this document.

---

## Objective

The product should feel like a premium, modern, dark health-tech product with the calm sophistication of Oura and Rise — not a basic tracker with light backgrounds and generic cards.

This document covers visual design, information hierarchy, interaction style, and UI system. It does not address backend logic.

The product should feel:
- Premium
- Minimal
- Intelligent
- Calming
- Polished
- AI-first
- Highly legible on mobile

---

## Design Problems This Solves

### 1. Generic visual language
The previous design had light backgrounds, standard cards, generic progress circles, and limited visual hierarchy. Primary and secondary information did not have enough contrast between them.

### 2. Not premium or tech-forward
The product looked more like an early prototype than a finished health product. Components felt functional but not designed. Metrics were displayed, but not in a beautiful or compelling way.

### 3. AI identity not visible enough
AI should feel embedded into the product experience — not like text dropped into a screen. Recommendation surfaces need stronger styling and hierarchy.

### 4. Fragmented navigation
The product should feel centered around two core jobs: **Food** and **Activity**. Everything should be organised around those two areas, with Dashboard and Profile supporting them.

### 5. Weak empty states
When nothing is logged, the app should still feel intentional and elegant. Zero states should look designed, not broken or unfinished.

---

## Brand Feel

The visual tone should feel like:
- **Oura** — dark, premium, clean, quiet confidence
- **Rise** — calm, polished, modern, soft intelligence
- **Whoop (lightly)** — performance credibility, but less aggressive and less dense

This should not feel like:
- A bright calorie counter
- A gamified fitness app
- A cluttered dashboard
- A medical portal
- A bodybuilding tracker

**Design keywords:** dark · premium · minimal · elevated · calm intelligence · health-tech · soft glow · subtle gradients · rounded surfaces · focused hierarchy

---

## Product Structure / Information Architecture

### Main navigation
- Dashboard
- Food
- Activity
- Profile

### Food section
- Log meal
- Meal ideas

### Activity section
- Log activity
- Workout ideas

Use those exact labels unless there is a very strong UX reason to improve them.

### Quick actions on dashboard
The four dashboard quick actions match the product structure exactly:
- Log meal
- Meal ideas
- Log activity
- Workout ideas

These should be styled like premium action tiles, not plain utility buttons.

---

## Core UX Principle

This is an AI-first daily health companion.

The interface should help users answer:
- What have I done today?
- What am I missing?
- What should I do next?

It should not feel like a spreadsheet of metrics.

---

## Visual Design System

### 1. Color palette

Use a predominantly dark palette.

**Backgrounds**
- App background: near-black / charcoal
- Primary surface: deep graphite
- Secondary surface: slightly lighter dark slate
- Cards should sit subtly above the background, not look flat

**Accent colors**

Use accents sparingly and intentionally. Semantic palette:

| Metric | Color |
|---|---|
| Calories | Warm white to soft amber |
| Protein | Violet / purple |
| Fiber | Emerald / green |
| Hydration | Electric blue / cyan |
| Activity / movement | Teal / mint |
| AI insight | Turquoise / cyan glow |
| Warning / over goal | Muted red / coral (only when needed) |

Avoid rainbow overload and overly saturated neon. Accents should feel refined and premium.

**Card styling**
- Large radius corners
- Very subtle borders
- Soft inner/outer shadow or glow only if tasteful
- Dark-on-dark layering with strong contrast on text

---

### 2. Typography

Typography is one of the primary ways the UI communicates premium quality.

**Style**
- Modern sans serif
- High readability
- Generous spacing
- Clear hierarchy

**Hierarchy**
- Page title: large, bold, warm white
- Section labels: small uppercase or small semibold with muted color
- Primary metric number: large and visually dominant
- Secondary metadata: small and muted

**Text behavior**
- Reduce clutter
- Avoid long explanatory paragraphs on the dashboard
- Keep microcopy concise, smart, and calm

---

### 3. Spacing and layout

The app should breathe.

**Rules**
- Larger outer margins
- Consistent spacing scale
- More whitespace between dashboard sections
- Tighter grouping within cards
- Avoid cramped metric cards
- Align edges carefully

Everything should look intentionally placed with balance and symmetry — not stacked quickly.

---

## Dashboard Design

### Objective

The dashboard should feel like a beautiful daily snapshot with a premium health-monitor feel.

It shows, in order:
1. AI insight
2. Main nutrition summary
3. Secondary nutrition metrics
4. Movement / activity snapshot
5. Quick actions

---

### Section 1: Greeting + date

Top of screen includes:
- Personalised greeting
- Date

Visual tone: simple, elegant, not overly large, enough breathing room from the top edge.

---

### Section 2: AI Insight card

This is a key branded moment.

**Purpose:** Show one smart, concise recommendation based on current data.

**Examples:**
- "You are behind on protein today. Consider a high-protein lunch or shake."
- "You have not logged activity yet. A 20-minute walk would move you toward your goal."
- "You are close to your calorie target. Keep dinner lighter if your goal is fat loss."

**Design:**
- Premium highlight card
- Dark teal / blue-tinted card treatment
- Subtle glow or tinted surface
- AI icon: minimal and elegant
- Text: short and sharp

This card should look more intentional and branded than a generic alert banner.

---

### Section 3: Main nutrition monitor

This is the most important visual part of the dashboard.

**Goal:** Create an Oura/Rise-inspired monitor-style health tracker — not straight bars.

**Primary metrics:**
- Calories (largest anchor metric)
- Protein
- Fiber
- Hydration

These four are the most useful daily decision-making metrics for v1 and create a clear hierarchy.

**Visual treatment:**

Do not use generic straight horizontal bars. Use premium, elegant visual components such as:
- Radial rings
- Segmented arcs
- Circular monitors
- Dial-inspired progress gauges

**Composition:**

One large hero monitor for Calories, then three smaller supporting monitors for Protein, Fiber, and Hydration.

**Each monitor shows:**
- Current value
- Target
- Remaining / over target status

**Over-goal logic:**
- The goal must be obvious
- Users can go over target
- When over target, the visual clearly shifts into an over-limit state
- Use tasteful warning color (muted red / coral)
- The component should still look premium, not alarming or broken

**Empty state:**

If no data exists:
- All monitors show 0
- Targets still visible where relevant
- No dashes, no broken placeholders, no partial fake fill
- Empty state still looks beautiful

Examples:
- 0 / 2200 kcal
- 0g / 150g protein
- 0g / 30g fiber
- 0 / 2.5L hydration

---

### Section 4: Secondary nutrition details

Below the main monitor, show additional metrics in a cleaner secondary layer.

**Secondary metrics:**
- Carbs
- Fat
- Omega-3
- Electrolytes
- Vitamins / micronutrient score

**Design:** Smaller cards or compact modules. They should feel part of the system but not compete with the hero metrics.

**Micronutrient recommendation:**

Instead of listing dozens of vitamins, use a higher-level representation such as:
- Micronutrient coverage
- Vitamins score
- Nutrient quality

Display as a compact ring, small coverage indicator, or quality badge. Keep it elegant and abstract enough for v1.

---

### Section 5: Movement / activity card

Movement is a separate section below nutrition, but still visible on the dashboard.

**Shows:**
- Steps / movement progress
- Workout completed today or not
- Short activity summary

**Design:**
- Compact premium card
- Ring or compact arc for steps/movement
- Short label for workout status
- Calm and integrated with the rest of the dashboard

**Empty state:**
- 0 steps
- No workout logged today
- Still styled cleanly and intentionally

---

### Section 6: Quick actions

Quick actions are visually strong and beautifully designed.

**Required actions:**
- Log meal
- Meal ideas
- Log activity
- Workout ideas

**Design:**
- Four premium tiles
- Large enough tap targets
- Icon + title + short supportive subtitle
- Should feel more like feature cards than plain buttons

**Tone:** Helpful, polished, and premium. Not generic utility controls.

---

## Food Section Design

### Structure

The Food section contains two major functions:
- Log meal
- Meal ideas

### Log meal

Users log by:
- Text
- Photo
- Voice

**Visual design:**
- Same dark premium system as dashboard
- Large input surface
- Elegant upload area for meal photo
- Voice entry: first-class, not secondary

**Result design:**

When AI analyses a meal, results should look premium:
- Meal title / summary
- Estimated calories
- Estimated macros
- Editable values
- Confidence / assumptions if needed

This should look like an intelligent assistant card, not a raw chat response.

### Meal ideas

Recommendation-driven:
- Based on remaining macros
- Based on goal
- Based on context

Visually: curated suggestions, not plain text dumps.

---

## Activity Section Design

### Structure

The Activity section contains:
- Log activity
- Workout ideas

### Log activity

Supports:
- Manual workout logging
- Imported workout data where relevant
- Voice / text logging

### Workout ideas

A premium AI planning surface.

**Examples:**
- 25-minute lower body workout
- Quick walk + core suggestion
- Upper body day recommendation

**Design:**

Avoid generic text blocks. Workout idea cards include:
- Title
- Duration
- Focus
- Short explanation
- CTA to log or start

---

## Voice Input Design Pattern

Voice should feel like a core interaction across the app.

Apply the same voice pattern consistently in:
- Log meal
- Meal ideas (where relevant)
- Log activity
- Workout ideas (where relevant)
- Profile onboarding

**Voice interaction states:**
1. Idle mic button
2. Recording state with pulse animation
3. Processing state
4. Transcript shown as editable text
5. User reviews and confirms

**Important rule:** Never auto-submit after transcription. Always let the user review and edit first.

**Visual tone:** Elegant, soft, and premium — not gimmicky.

---

## Profile Design

### Objective

Profile should be a real personal health overview, not just a settings page or form.

Once user data exists, Profile shows a polished summary of the person and their strategy.

### Profile sections

**1. Personal overview**
- Name
- Height
- Weight
- Goal
- Activity level

**2. Progress section**
- Current weight
- Weight trend over time if available
- Simple visual chart or elegant trend component
- If no history exists, show a clean empty state

**3. Goal summary**

Explains the user's current goal clearly:
- Lose fat
- Build muscle
- Maintain weight
- Improve consistency

**4. Personalised guidance summary**

Based on profile data and goal, shows:
- Target calorie range
- Protein target
- Hydration target
- Suggested weekly workout frequency
- Suggested movement / steps target
- General nutrition focus
- General activity focus

This should feel like a professional summary of what the user should be doing.

**Empty state:**

If profile is not complete, show an elegant onboarding prompt that explains why completing the profile improves recommendations.

---

## Empty-State Rules

Empty states are critical and must feel deliberate across the entire product.

**Rules:**
- No broken visuals
- No weird dashes unless explicitly meaningful
- No placeholder clutter
- All zero-data states must still feel premium
- Users should understand what will appear once they start logging

**Tone:** Calm and motivating — not empty or dead.

---

## Interaction Style

### Motion

Use subtle motion only.

**Good motion:**
- Soft hover/tap feedback
- Elegant transitions
- Mic pulse animation
- Smooth gauge animation when values update

**Avoid:**
- Bouncy or gimmicky motion
- Flashy animations
- Aggressive gamification

---

## Design Tokens

A reusable design system should be applied consistently across the app. Define and maintain:

- Colors
- Typography scale
- Spacing scale
- Border radii
- Shadows / glows
- Semantic metric colors
- Card styles
- Input styles
- Icon styles
- Gauge styles

This ensures the UI remains visually consistent as new screens are added.

---

## Non-Negotiables

- Dark premium UI
- Oura / Rise-inspired aesthetic
- Nutrition monitor must feel beautiful and high-end
- Main tracker must use rings / arcs / monitor-like visuals — not plain bars
- Dashboard must show 0 values cleanly when no data exists
- Navigation simplified to: Dashboard / Food / Activity / Profile
- Quick actions must be: Log meal / Meal ideas / Log activity / Workout ideas
- Profile must be a polished profile overview, not just form fields
- Overall product must feel calmer, more refined, and more intentional

---

## Implementation Priority Order

When updating the UI, work in this order:

1. Create design tokens / visual system
2. Redesign navigation structure
3. Redesign dashboard composition
4. Redesign main monitor/gauge components
5. Improve empty states
6. Redesign quick action cards
7. Redesign Food and Activity screens to match the new system
8. Redesign Profile into a true profile overview page

**When tradeoffs are needed, prefer:**
- Fewer elements
- Stronger hierarchy
- More whitespace
- More elegant monitors
- Clearer focus on the most important health decisions

The final result should feel like a premium consumer wellness product, not an MVP admin dashboard.
