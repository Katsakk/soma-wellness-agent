Design PRD

Objective

Redesign the current app so it feels like a premium, modern, dark health-tech product with the calm sophistication of Oura and Rise, rather than a basic tracker with light backgrounds and generic cards.

This PRD is focused on visual design, information hierarchy, interaction style, and UI system — not backend logic.

The goal is to make the app feel:
	•	premium
	•	minimal
	•	intelligent
	•	calming
	•	polished
	•	AI-first
	•	highly legible on mobile

⸻

Current design issues to fix

From the current build, the biggest issues are:

1. The visual language feels generic
	•	light backgrounds
	•	standard cards
	•	generic progress circles
	•	limited visual hierarchy
	•	not enough contrast between primary and secondary information

2. The app does not yet feel premium or tech-forward
	•	it looks more like an early prototype than a finished health product
	•	components feel functional but not designed
	•	metrics are displayed, but not in a beautiful or compelling way

3. AI-first identity is not visible enough
	•	AI should feel embedded into the product experience, not like text dropped into a screen
	•	recommendation surfaces need stronger styling and hierarchy

4. Navigation and page structure feel fragmented

The product should feel centered around two core jobs:
	•	Food
	•	Activity

Everything should be organized around those two areas, with Dashboard and Profile supporting them.

5. Empty states are weak

When nothing is logged, the app should still feel intentional and elegant.
Zero states should look designed, not broken or unfinished.

⸻

Core design direction

Brand feel

The visual tone should feel like:
	•	Oura: dark, premium, clean, quiet confidence
	•	Rise: calm, polished, modern, soft intelligence
	•	Whoop (lightly): performance credibility, but less aggressive and less dense

This should not feel like:
	•	a bright calorie counter
	•	a gamified fitness app
	•	a cluttered dashboard
	•	a medical portal
	•	a bodybuilding tracker

Keywords
	•	dark
	•	premium
	•	minimal
	•	elevated
	•	calm intelligence
	•	health-tech
	•	soft glow
	•	subtle gradients
	•	rounded surfaces
	•	focused hierarchy

⸻

Product structure / information architecture

Simplify the product into 4 top-level areas:

Main navigation
	•	Dashboard
	•	Food
	•	Activity
	•	Profile

Food section

Food should contain:
	•	Log meal
	•	Meal ideas

Activity section

Activity should contain:
	•	Log activity
	•	Workout ideas

Use those exact labels unless there is a very strong UX reason to improve them slightly.

Quick actions on dashboard

The 4 dashboard quick actions should match the product structure exactly:
	•	Log meal
	•	Meal ideas
	•	Log activity
	•	Workout ideas

These should be styled like premium action tiles, not plain utility buttons.

⸻

Main UX principle

This is an AI-first daily health companion.

The interface should help users answer:
	•	What have I done today?
	•	What am I missing?
	•	What should I do next?

It should not feel like a spreadsheet of metrics.

⸻

Visual design system

1. Color palette

Use a predominantly dark palette.

Backgrounds
	•	app background: near-black / charcoal
	•	primary surface: deep graphite
	•	secondary surface: slightly lighter dark slate
	•	cards should sit subtly above the background, not look flat

Accent colors

Use accents sparingly and intentionally.
Suggested semantic palette:
	•	Calories: warm white to soft amber
	•	Protein: violet / purple
	•	Fiber: emerald / green
	•	Hydration: electric blue / cyan
	•	Activity / movement: teal / mint
	•	AI insight: turquoise / cyan glow
	•	Warning / over goal: muted red / coral, only when needed

Important:
	•	avoid rainbow overload
	•	avoid overly saturated neon everywhere
	•	accents should feel refined and premium

Card styling
	•	large radius corners
	•	very subtle borders
	•	soft inner/outer shadow or glow only if tasteful
	•	dark-on-dark layering with strong contrast on text

⸻

2. Typography

Typography should be one of the main ways the UI feels premium.

Style
	•	modern sans serif
	•	high readability
	•	generous spacing
	•	clear hierarchy

Hierarchy
	•	page title: large, bold, warm white
	•	section labels: small uppercase or small semibold with muted color
	•	primary metric number: large and visually dominant
	•	secondary metadata: small and muted

Text behavior
	•	reduce clutter
	•	avoid long explanatory paragraphs on the dashboard
	•	keep microcopy concise, smart, and calm

⸻

3. Spacing and layout

The app should breathe.

Rules
	•	larger outer margins
	•	consistent spacing scale
	•	more whitespace between dashboard sections
	•	tighter grouping within cards
	•	avoid cramped metric cards
	•	align edges very carefully

Overall layout feel

Everything should look intentionally placed with balance and symmetry, not stacked quickly.

⸻

Dashboard design

Dashboard objective

The dashboard should feel like a beautiful daily snapshot with a premium health-monitor feel.

It should show:
	1.	AI insight
	2.	main nutrition summary
	3.	secondary nutrition metrics
	4.	movement / activity snapshot
	5.	quick actions

⸻

Dashboard section 1: Greeting + date

Top of screen should include:
	•	personalized greeting
	•	date

Visual tone:
	•	simple
	•	elegant
	•	not overly large
	•	enough breathing room from top edge

⸻

Dashboard section 2: AI Insight card

This is a key branded moment.

Purpose

Show one smart, concise recommendation based on current data.

Examples
	•	You are behind on protein today. Consider a high-protein lunch or shake.
	•	You have not logged activity yet. A 20-minute walk would move you toward your goal.
	•	You are close to your calorie target. Keep dinner lighter if your goal is fat loss.

Design
	•	premium highlight card
	•	dark teal / blue-tinted card treatment
	•	subtle glow or tinted surface
	•	AI icon can be minimal and elegant
	•	keep text short and sharp

This card should look more intentional and branded than a generic alert banner.

⸻

Dashboard section 3: Main nutrition monitor

This is the most important visual part of the dashboard.

Goal

Create an Oura/Rise-inspired monitor-style health tracker, not straight bars.

Priority metrics for the main monitor

The main visible nutrition metrics should be:
	•	Calories (largest anchor metric)
	•	Protein
	•	Fiber
	•	Hydration

Why these four

They are the most useful daily decision-making metrics for v1 and create a clear hierarchy.

Visual treatment

Do not use generic straight horizontal bars for the main area.
Use more premium, elegant visual components such as:
	•	radial rings
	•	segmented arcs
	•	circular monitors
	•	dial-inspired progress gauges

Composition recommendation

Use one large hero monitor for Calories, then 3 smaller supporting monitors for:
	•	Protein
	•	Fiber
	•	Hydration

Behavior

Each monitor should clearly show:
	•	current value
	•	target
	•	remaining / over target status

Over-goal logic

For metrics like calories:
	•	the goal must be obvious
	•	users can go over target
	•	when over target, the visual should clearly shift into an over-limit state
	•	use a tasteful warning color (muted red / coral)
	•	the component should still look premium, not alarming or broken

Empty state logic

If no input exists:
	•	all monitors must show 0
	•	targets still visible where relevant
	•	no dashes
	•	no broken placeholders
	•	no partial fake fill
	•	empty state should still look beautiful

Example:
	•	0 / 2200 kcal
	•	0g / 150g protein
	•	0g / 30g fiber
	•	0 / 2.5L hydration

⸻

Dashboard section 4: Secondary nutrition details

Below the main monitor area, show additional nutrition metrics in a cleaner secondary layer.

Secondary metrics
	•	Carbs
	•	Fat
	•	Omega-3
	•	Electrolytes
	•	Vitamins / micronutrient score

Design approach

These should be smaller cards or compact modules.
They should feel part of the system but not compete with the hero metrics.

Important

Avoid overloading the user with too much detail at once.
If needed, make micronutrients more summary-oriented.

Micronutrient recommendation

Instead of listing dozens of vitamins, use a higher-level representation such as:
	•	Micronutrient coverage
	•	Vitamins score
	•	Nutrient quality

This could be displayed as:
	•	compact ring
	•	small coverage indicator
	•	quality badge / score

Keep it elegant and abstract enough for v1.

⸻

Dashboard section 5: Movement / activity card

Movement should be a separate section below nutrition, but still visible on the dashboard.

Show
	•	steps / movement progress
	•	workout completed today or not
	•	short activity summary

Design
	•	compact premium card
	•	ring or compact arc for steps/movement
	•	short label for workout status
	•	should feel calm and integrated with the rest of the dashboard

Empty state

If nothing is logged:
	•	0 steps
	•	no workout logged today
	•	still styled cleanly and intentionally

⸻

Dashboard section 6: Quick actions

Quick actions should be visually strong and beautifully designed.

Must include
	•	Log meal
	•	Meal ideas
	•	Log activity
	•	Workout ideas

Design
	•	4 premium tiles
	•	large enough tap targets
	•	icon + title + short supportive subtitle
	•	should feel more like feature cards than plain buttons

Tone

Helpful, polished, and premium.
Not generic utility controls.

⸻

Food section design

Food page structure

The Food section should contain two major functions:
	•	Log meal
	•	Meal ideas

Log meal

Users should be able to log by:
	•	text
	•	photo
	•	voice

Visual design
	•	same dark premium system as dashboard
	•	large input surface
	•	elegant upload area for meal photo
	•	voice entry should feel first-class, not secondary

Result design

When AI analyzes a meal, results should look premium:
	•	meal title / summary
	•	estimated calories
	•	estimated macros
	•	editable values
	•	confidence / assumptions if needed

This should look more like an intelligent assistant card than a raw chat response.

Meal ideas

Meal ideas should be recommendation-driven:
	•	based on remaining macros
	•	based on goal
	•	based on context

Visually, this should look like curated suggestions, not plain text dumps.

⸻

Activity section design

Activity page structure

The Activity section should contain:
	•	Log activity
	•	Workout ideas

Log activity

Should support:
	•	manual workout logging
	•	imported workout data if relevant
	•	voice / text logging

Workout ideas

This should feel like a premium AI planning surface.

Examples:
	•	25-minute lower body workout
	•	quick walk + core suggestion
	•	upper body day recommendation

Design

Avoid generic text blocks.
Workout idea cards should include:
	•	title
	•	duration
	•	focus
	•	short explanation
	•	CTA to log or start

⸻

Voice input design pattern

Voice should feel like a core interaction across the app.

Apply the same voice pattern consistently in:
	•	Log meal
	•	Meal ideas if relevant
	•	Log activity
	•	Workout ideas if relevant
	•	Profile onboarding

Voice interaction states
	1.	idle mic button
	2.	recording state with pulse animation
	3.	processing state
	4.	transcript shown as editable text
	5.	user reviews and confirms

Important rule

Never auto-submit after transcription.
Always let the user review/edit first.

Visual tone

Voice interaction should feel elegant, soft, and premium — not gimmicky.

⸻

Profile design

Objective

Profile should become a real personal health overview, not just a settings page or form.

Once user data exists, Profile should show a polished summary of the person and their strategy.

Profile should include

1. Personal overview
	•	name
	•	height
	•	weight
	•	goal
	•	activity level

2. Progress section
	•	current weight
	•	weight trend over time if available
	•	simple visual chart or elegant trend component
	•	if no history exists, show a clean empty state

3. Goal summary
Explain the user’s current goal clearly, such as:
	•	lose fat
	•	build muscle
	•	maintain weight
	•	improve consistency

4. Personalized guidance summary
Based on profile data and goal, show:
	•	target calorie range
	•	protein target
	•	hydration target
	•	suggested weekly workout frequency
	•	suggested movement / steps target
	•	general nutrition focus
	•	general activity focus

This should feel like a professional summary of what the user should be doing.

Empty state

If profile is not complete:
	•	show elegant onboarding/setup prompt
	•	explain why completing the profile improves recommendations

⸻

Empty-state rules across the product

Empty states are very important and must feel deliberate.

Rules
	•	no broken visuals
	•	no weird dashes unless explicitly meaningful
	•	no placeholder clutter
	•	all zero-data states should still feel premium
	•	users should understand what will appear once they start logging

Tone

Calm and motivating, not empty or dead.

⸻

Interaction style

Motion

Use subtle motion only.

Good motion
	•	soft hover/tap feedback
	•	elegant transitions
	•	mic pulse animation
	•	smooth gauge animation when values update

Avoid
	•	bouncy gimmicky motion
	•	flashy animations
	•	aggressive gamification

⸻

Design tokens to implement

Create a reusable design system and apply it across the app.

Please define
	•	colors
	•	typography scale
	•	spacing scale
	•	border radii
	•	shadows / glows
	•	semantic metric colors
	•	card styles
	•	input styles
	•	icon styles
	•	gauge styles

Create this as a reusable theme or token system so the UI remains consistent.

⸻

Non-negotiables
	•	dark premium UI
	•	Oura / Rise-inspired aesthetic
	•	nutrition monitor should feel beautiful and high-end
	•	main tracker should use rings / arcs / monitor-like visuals, not plain bars
	•	dashboard must show 0 values cleanly when no data exists
	•	navigation should be simplified to Dashboard / Food / Activity / Profile
	•	quick actions should be: Log meal / Meal ideas / Log activity / Workout ideas
	•	profile must become a polished profile overview, not just form fields
	•	overall product must feel calmer, more refined, and more intentional

⸻

Final implementation guidance for Claude / Lovable

When updating the UI, prioritize in this order:
	1.	create design tokens / visual system
	2.	redesign navigation structure
	3.	redesign dashboard composition
	4.	redesign main monitor/gauge components
	5.	improve empty states
	6.	redesign quick action cards
	7.	redesign Food and Activity screens to match the new system
	8.	redesign Profile into a true profile overview page

If tradeoffs are needed, prefer:
	•	fewer elements
	•	stronger hierarchy
	•	more whitespace
	•	more elegant monitors
	•	clearer focus on the most important health decisions

The final result should feel like a premium consumer wellness product, not an MVP admin dashboard.