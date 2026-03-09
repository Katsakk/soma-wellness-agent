Ideas Tab — Product Requirements Document
Objective
Add a new Ideas tab to the main navigation, replacing the separate Meal Ideas and Workout Ideas quick actions. This tab centralises discovery and recommendation into one premium surface, powered by location-aware suggestions and AI insight.

Navigation changes

Add Ideas as a new top-level tab in the main navigation
Final navigation order: Dashboard · Food · Activity · Ideas · Profile
The Meal Ideas and Workout Ideas quick actions on the Dashboard should redirect to the Ideas tab, landing on the relevant section


Ideas tab structure
The tab contains two sections, toggled at the top:

Meal Ideas
Activity Ideas

Default landing section is determined by which quick action the user tapped. If accessed directly from the tab bar, default to Meal Ideas.

Location and permissions

On first visit to the Ideas tab, request location permission from the user
If denied, show an elegant empty state explaining that location is needed for recommendations
Once granted, use the device's current location for all recommendations
Location should refresh each session, not be stored permanently


Meal Ideas section
Purpose
Recommend nearby restaurants that align with the user's nutritional goals and today's consumption.
Google Maps integration

Use Google Maps Places API to find restaurants within a configurable radius (default: 1km, expandable to 3km and 5km)
Display results on an embedded Google Map
Each result should also appear as a card below the map

Restaurant card design
Each card should include:

Restaurant name
Cuisine type
Distance from user
Google rating
A short AI-generated explanation of why it fits the user's goals today

AI Insight panel
Above the map, show a concise AI insight card explaining:

What the user has eaten today
What macros or nutrients they still need
Why the recommended restaurants are a good match
Example: "You are 40g short on protein today. These restaurants offer high-protein options that fit your calorie budget."

Filtering
Allow the user to filter by:

Distance (1km / 3km / 5km)
Cuisine type
Goal alignment (high protein / low calorie / balanced)


Activity Ideas section
Purpose
Recommend nearby gyms, studios, or fitness venues that match the user's activity goals and today's movement level.
Google Maps integration

Use Google Maps Places API to find fitness venues within configurable radius (default: 1km, expandable to 3km and 5km)
Display results on an embedded Google Map
Each result should also appear as a card below the map

Venue card design
Each card should include:

Venue name
Venue type (gym / yoga / pilates / CrossFit / swimming etc.)
Distance from user
Google rating
A short AI-generated explanation of why it suits the user's goals today

AI Insight panel
Above the map, show a concise AI insight card explaining:

Today's activity level so far
What type of movement would complement it
Why the recommended venues are a good fit
Example: "You have not logged any activity today. These studios offer beginner-friendly classes that match your fat loss goal."

Filtering
Allow the user to filter by:

Distance (1km / 3km / 5km)
Venue type (gym / yoga / pilates / CrossFit / other)
Intensity (low / moderate / high)


Visual design
Follow the existing design system defined in DESIGN.md exactly.

Dark premium UI throughout
Map should use a dark-styled map theme (Google Maps supports custom styling)
Cards should match the existing card system — large radius, subtle borders, dark surfaces
AI Insight panel should use the same teal/cyan treatment as the Dashboard AI card
Section toggle (Meal Ideas / Activity Ideas) should be a clean pill or tab selector, not a dropdown
Empty states (no location, no results) must be elegant and intentional — never broken


Technical requirements

Google Maps JavaScript API for the embedded map
Google Maps Places API (Nearby Search) for venue discovery
Store the Google Maps API key securely as an environment variable: VITE_GOOGLE_MAPS_API_KEY
AI insight generated via the existing Gemini edge function, passing user profile, today's logs, and nearby results as context
Location accessed via the browser Geolocation API
All API calls should have graceful error handling and loading states


Empty and loading states

Loading: show a premium skeleton/shimmer state while fetching location and results
No location permission: elegant prompt explaining why location improves recommendations
No results found: calm message suggesting expanding the search radius
API error: friendly error with a retry option


Implementation priority for Claude Code

Create the Ideas tab and wire up navigation
Connect Dashboard quick actions to the correct Ideas section
Implement location permission request and handling
Integrate Google Maps embed with dark styling
Integrate Places API for restaurant and venue search
Build card components for results
Connect AI Insight panel via Gemini edge function
Add filtering controls
Polish empty states and loading states


Non-negotiables

Must feel as premium as the rest of the app
Map must use dark styling to match the UI
AI Insight must always connect recommendations to the user's actual data, not generic advice
Location permission must be requested gracefully, never assumed
Quick actions on Dashboard must route correctly to the relevant section