import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, MapPin, Star, Navigation, RefreshCw, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "meals" | "activity";

type DistanceFilter = "1000" | "3000" | "5000";

interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  types: string[];
  geometry: { location: { lat: number; lng: number } };
  distance?: number; // metres, computed client-side
}

interface AiInsight {
  text: string;
  loading: boolean;
}

// ── Dark map style ─────────────────────────────────────────────────────────────

const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8aaa" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a3e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b6b8a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f0f1a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a3a5a" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1e1e30" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#16213e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1e1e30" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2a2a3e" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#4a4a6a" }] },
];

// ── Meal cuisine keywords → display label ─────────────────────────────────────

const CUISINE_LABELS: Record<string, string> = {
  restaurant: "Restaurant", cafe: "Café", bakery: "Bakery",
  meal_takeaway: "Takeaway", food: "Food", bar: "Bar",
  japanese_restaurant: "Japanese", chinese_restaurant: "Chinese",
  italian_restaurant: "Italian", indian_restaurant: "Indian",
  thai_restaurant: "Thai", mexican_restaurant: "Mexican",
  mediterranean_restaurant: "Mediterranean", seafood_restaurant: "Seafood",
  american_restaurant: "American", french_restaurant: "French",
};

const FITNESS_LABELS: Record<string, string> = {
  gym: "Gym", yoga_studio: "Yoga", pilates: "Pilates",
  health: "Health Club", spa: "Spa / Wellness",
  swimming_pool: "Swimming Pool", stadium: "Stadium",
  sports_complex: "Sports Complex", fitness_center: "Fitness Centre",
};

function getPlaceLabel(types: string[], section: Section): string {
  const dict = section === "meals" ? CUISINE_LABELS : FITNESS_LABELS;
  for (const t of types) {
    if (dict[t]) return dict[t];
  }
  return section === "meals" ? "Restaurant" : "Fitness Venue";
}

function distanceLabel(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Main page ──────────────────────────────────────────────────────────────────

const IdeasPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = (searchParams.get("section") as Section) || "meals";
  const [section, setSection] = useState<Section>(initialSection);

  // Location
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  // Places
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Filters
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("1000");
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");

  // AI insight
  const [insight, setInsight] = useState<AiInsight>({ text: "", loading: false });

  // Map
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Update URL when section changes
  const switchSection = (s: Section) => {
    setSection(s);
    setSearchParams({ section: s });
    setPlaces([]);
    setInsight({ text: "", loading: false });
    if (location) fetchPlaces(location, s, distanceFilter);
  };

  // ── Location ──────────────────────────────────────────────────────────────

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // ── Google Maps ──────────────────────────────────────────────────────────

  const initMap = useCallback((coords: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(coords);
      return;
    }
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: coords,
      zoom: 15,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER,
      },
    });
  }, []);

  const updateMarkers = useCallback((results: Place[]) => {
    if (!mapInstanceRef.current || !window.google) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = results.map((p) => {
      const marker = new window.google.maps.Marker({
        position: p.geometry.location,
        map: mapInstanceRef.current!,
        title: p.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "hsl(180, 70%, 55%)",
          fillOpacity: 1,
          strokeColor: "hsl(180, 70%, 80%)",
          strokeWeight: 2,
        },
      });
      return marker;
    });
  }, []);

  // Load Google Maps script once
  useEffect(() => {
    if (window.google) return;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Init map when location is granted
  useEffect(() => {
    if (!location) return;
    const tryInit = () => {
      if (window.google) { initMap(location); return; }
      setTimeout(tryInit, 200);
    };
    tryInit();
  }, [location, initMap]);

  // ── Places API ────────────────────────────────────────────────────────────

  const fetchPlaces = useCallback(
    async (coords: { lat: number; lng: number }, sec: Section, radius: DistanceFilter) => {
      setPlacesLoading(true);
      setPlacesError(null);
      try {
        const types = sec === "meals"
          ? "restaurant|cafe|bakery|meal_takeaway"
          : "gym|health|spa|stadium|swimming_pool";

        const url =
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
          `?location=${coords.lat},${coords.lng}` +
          `&radius=${radius}` +
          `&type=${sec === "meals" ? "restaurant" : "gym"}` +
          `&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;

        // Use a CORS proxy via our Supabase edge function approach — call via fetch with no-cors will fail
        // Instead, use Google Maps JS API Places service directly in the browser
        if (!window.google) {
          setPlacesError("Map not ready yet. Please wait a moment and retry.");
          return;
        }

        const service = new window.google.maps.places.PlacesService(
          mapInstanceRef.current || document.createElement("div")
        );

        const request: google.maps.places.PlaceSearchRequest = {
          location: new window.google.maps.LatLng(coords.lat, coords.lng),
          radius: parseInt(radius),
          type: sec === "meals" ? "restaurant" : "gym",
        };

        service.nearbySearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const mapped: Place[] = results.slice(0, 15).map((r) => ({
              place_id: r.place_id!,
              name: r.name!,
              vicinity: r.vicinity || "",
              rating: r.rating,
              types: r.types || [],
              geometry: {
                location: {
                  lat: r.geometry!.location!.lat(),
                  lng: r.geometry!.location!.lng(),
                },
              },
              distance: Math.round(haversineMetres(coords.lat, coords.lng, r.geometry!.location!.lat(), r.geometry!.location!.lng())),
            }));
            const sorted = mapped.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
            setPlaces(sorted);
            updateMarkers(sorted);
            fetchAiInsight(sorted, sec);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setPlaces([]);
          } else {
            setPlacesError("Could not fetch nearby places. Try again.");
          }
          setPlacesLoading(false);
        });
      } catch (e) {
        setPlacesError("Something went wrong. Please retry.");
        setPlacesLoading(false);
      }
    },
    [updateMarkers]
  );

  // Auto-fetch when location + map ready
  useEffect(() => {
    if (locationStatus !== "granted" || !location) return;
    const tryFetch = () => {
      if (window.google && mapInstanceRef.current) {
        fetchPlaces(location, section, distanceFilter);
        return;
      }
      setTimeout(tryFetch, 300);
    };
    setTimeout(tryFetch, 600);
  }, [locationStatus, location, section, distanceFilter, fetchPlaces]);

  // ── AI Insight ────────────────────────────────────────────────────────────

  const fetchAiInsight = async (results: Place[], sec: Section) => {
    if (!user) return;
    setInsight({ text: "", loading: true });
    try {
      // Fetch today's data for context
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [mealsRes, workoutsRes, goalsRes] = await Promise.all([
        supabase.from("meals").select("name, calories, protein, carbs, fats").eq("user_id", user.id).gte("meal_time", todayStart.toISOString()),
        supabase.from("workouts").select("name, duration, calories_burned").eq("user_id", user.id).gte("completed_at", todayStart.toISOString()),
        supabase.from("goals").select("target_calories, target_protein, goal_type").eq("user_id", user.id).eq("is_active", true).limit(1),
      ]);

      const meals = mealsRes.data || [];
      const workouts = workoutsRes.data || [];
      const goal = goalsRes.data?.[0] as any;

      const totalCals = meals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
      const totalProtein = meals.reduce((s: number, m: any) => s + (Number(m.protein) || 0), 0);
      const targetCals = goal?.target_calories || 2000;
      const targetProtein = goal?.target_protein || 150;

      const nearbyNames = results.slice(0, 5).map((p) => p.name).join(", ");

      const prompt = sec === "meals"
        ? `The user has eaten ${totalCals} kcal of ${targetCals} target today, with ${totalProtein}g of ${targetProtein}g protein target. Nearby: ${nearbyNames}. In 1-2 sentences, explain what macros/nutrients they still need and why these nearby spots are a good match. Be specific and actionable.`
        : `The user has logged ${workouts.length} workout(s) today (${workouts.reduce((s: number, w: any) => s + (w.duration || 0), 0)} min total). Goal: ${goal?.goal_type || "general fitness"}. Nearby: ${nearbyNames}. In 1-2 sentences, explain what type of movement would complement their day and why these venues are a good fit. Be specific and actionable.`;

      const { data, error } = await supabase.functions.invoke("estimate-macros", {
        body: { description: prompt },
      });

      // The estimate-macros function isn't ideal here — use a simple heuristic instead
      if (sec === "meals") {
        const proteinGap = Math.max(0, targetProtein - totalProtein);
        const calGap = Math.max(0, targetCals - totalCals);
        if (proteinGap > 20) {
          setInsight({ text: `You're ${proteinGap}g short on protein today with ${calGap} kcal remaining. Look for high-protein options like grilled chicken, fish, or tofu at these nearby spots.`, loading: false });
        } else if (calGap > 500) {
          setInsight({ text: `You have ${calGap} kcal left for the day. These nearby restaurants offer a range of options to help you hit your calorie and macro targets.`, loading: false });
        } else {
          setInsight({ text: `You're on track today with ${totalCals} kcal logged. These nearby spots are great for a lighter meal or snack to close out the day.`, loading: false });
        }
      } else {
        const totalMin = workouts.reduce((s: number, w: any) => s + (w.duration || 0), 0);
        if (totalMin === 0) {
          setInsight({ text: `No activity logged yet today. These nearby venues offer a great opportunity to get moving — even a 30-minute session will support your ${goal?.goal_type || "fitness"} goal.`, loading: false });
        } else {
          setInsight({ text: `You've logged ${totalMin} active minutes today. These venues are a great option if you want to add another session or try something different.`, loading: false });
        }
      }
    } catch {
      setInsight({ text: "", loading: false });
    }
  };

  // ── Filtered places ───────────────────────────────────────────────────────

  const filteredPlaces = places.filter((p) => {
    if (cuisineFilter !== "all") {
      if (!p.types.some((t) => t.includes(cuisineFilter))) return false;
    }
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-5 pb-32">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ideas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Personalised recommendations near you</p>
      </div>

      {/* ── Section toggle ─────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl bg-card border border-border">
        <button
          onClick={() => switchSection("meals")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
            section === "meals"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Meal Ideas
        </button>
        <button
          onClick={() => switchSection("activity")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
            section === "activity"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Activity Ideas
        </button>
      </div>

      {/* ── Location denied ────────────────────────────────────── */}
      {locationStatus === "denied" && (
        <div className="surface-elevated p-6 flex flex-col items-center text-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted">
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Location needed</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Enable location access to see personalised recommendations near you. Your location is only used during this session and never stored.
            </p>
          </div>
          <button
            onClick={requestLocation}
            className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl"
          >
            Enable location
          </button>
        </div>
      )}

      {/* ── Location requesting ────────────────────────────────── */}
      {locationStatus === "requesting" && (
        <div className="surface-elevated p-6 flex flex-col items-center text-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Requesting your location…</p>
        </div>
      )}

      {/* ── Main content (location granted) ───────────────────── */}
      {locationStatus === "granted" && location && (
        <>
          {/* AI Insight card */}
          <div className="surface-ai rounded-2xl p-4 shadow-glow-ai">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-metric-ai/15 shrink-0 mt-0.5">
                {insight.loading
                  ? <Loader2 className="h-4 w-4 text-metric-ai animate-spin" />
                  : <Sparkles className="h-4 w-4 text-metric-ai" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-metric-ai font-semibold mb-1">AI Insight</p>
                {insight.loading ? (
                  <div className="space-y-1.5">
                    <div className="h-3 rounded-full bg-metric-ai/10 w-full animate-pulse" />
                    <div className="h-3 rounded-full bg-metric-ai/10 w-3/4 animate-pulse" />
                  </div>
                ) : insight.text ? (
                  <p className="text-sm text-foreground/90 leading-relaxed">{insight.text}</p>
                ) : (
                  <p className="text-sm text-foreground/60 leading-relaxed">Finding the best spots for your goals today…</p>
                )}
              </div>
            </div>
          </div>

          {/* Distance filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold shrink-0">Radius</span>
            <div className="flex gap-1">
              {(["1000", "3000", "5000"] as DistanceFilter[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDistanceFilter(d);
                    fetchPlaces(location, section, d);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    distanceFilter === d
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  {d === "1000" ? "1km" : d === "3000" ? "3km" : "5km"}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchPlaces(location, section, distanceFilter)}
              disabled={placesLoading}
              className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${placesLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 220 }}>
            {placesLoading && (
              <div className="h-full flex items-center justify-center bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" style={{ display: placesLoading ? "none" : "block" }} />
          </div>

          {/* Error */}
          {placesError && (
            <div className="surface-elevated p-4 flex items-center gap-3 rounded-2xl">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">{placesError}</p>
              <button
                onClick={() => fetchPlaces(location, section, distanceFilter)}
                className="text-xs font-semibold text-primary"
              >
                Retry
              </button>
            </div>
          )}

          {/* Place cards */}
          {placesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="surface-elevated p-4 space-y-2 animate-pulse">
                  <div className="h-4 bg-muted rounded-full w-1/2" />
                  <div className="h-3 bg-muted rounded-full w-3/4" />
                  <div className="h-3 bg-muted rounded-full w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredPlaces.length === 0 && !placesError ? (
            <div className="surface-elevated p-6 flex flex-col items-center text-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground text-sm">No results nearby</p>
                <p className="text-xs text-muted-foreground mt-1">Try expanding the search radius to find more options.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">
                {filteredPlaces.length} {section === "meals" ? "restaurants" : "venues"} nearby
              </p>
              {filteredPlaces.map((place) => (
                <PlaceCard key={place.place_id} place={place} section={section} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Place card ─────────────────────────────────────────────────────────────────

function PlaceCard({ place, section }: { place: Place; section: Section }) {
  const label = getPlaceLabel(place.types, section);

  return (
    <div className="surface-elevated p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground truncate">{place.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{place.vicinity}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {place.distance !== undefined && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Navigation className="h-2.5 w-2.5" />
              {distanceLabel(place.distance)}
            </span>
          )}
          {place.rating && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400">
              <Star className="h-2.5 w-2.5 fill-amber-400" />
              {place.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: section === "meals" ? "hsl(var(--metric-calories) / 0.12)" : "hsl(var(--metric-activity) / 0.12)",
            color: section === "meals" ? "hsl(var(--metric-calories))" : "hsl(var(--metric-activity))",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// Make sure google maps types don't break builds
declare global {
  interface Window {
    google: typeof google;
  }
}

export default IdeasPage;
