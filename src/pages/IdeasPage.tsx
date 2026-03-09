import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, MapPin, Star, Navigation, RefreshCw,
  Loader2, AlertCircle, Utensils, Dumbbell,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "meals" | "activity";
type DistanceFilter = "1000" | "3000" | "5000";
type GoalFilter = "all" | "high-protein" | "low-calorie" | "balanced";
type VenueTypeFilter = "all" | "gym" | "yoga" | "pilates" | "crossfit" | "other";
type IntensityFilter = "all" | "low" | "moderate" | "high";

interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  geometry: { location: { lat: number; lng: number } };
  distance?: number;
  price_level?: number;
}

// ── Dark map style ─────────────────────────────────────────────────────────────

const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#12121e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#12121e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b6b8a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e1e2e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#12121e" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#5a5a7a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#252535" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#6b6b8a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0a12" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#2a2a3a" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#181828" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#10101a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#4a4a6a" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#181828" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1e1e2e" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#3a3a5a" }] },
];

// ── Venue labels ──────────────────────────────────────────────────────────────

const MEAL_TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant", cafe: "Café", bakery: "Bakery",
  meal_takeaway: "Takeaway", bar: "Bar & Kitchen", food: "Food",
  japanese_restaurant: "Japanese", chinese_restaurant: "Chinese",
  italian_restaurant: "Italian", indian_restaurant: "Indian",
  thai_restaurant: "Thai", mexican_restaurant: "Mexican",
  mediterranean_restaurant: "Mediterranean", seafood_restaurant: "Seafood",
  american_restaurant: "American", french_restaurant: "French",
  vietnamese_restaurant: "Vietnamese", korean_restaurant: "Korean",
  vegetarian_restaurant: "Vegetarian", vegan_restaurant: "Vegan",
};

const FITNESS_TYPE_LABELS: Record<string, string> = {
  gym: "Gym", health: "Health Club", spa: "Spa & Wellness",
  swimming_pool: "Swimming Pool", stadium: "Stadium",
  sports_complex: "Sports Complex", fitness_center: "Fitness Centre",
  yoga_studio: "Yoga", pilates: "Pilates", dance_school: "Dance / Classes",
};

function getTypeLabel(types: string[], section: Section): string {
  const dict = section === "meals" ? MEAL_TYPE_LABELS : FITNESS_TYPE_LABELS;
  for (const t of types) {
    if (dict[t]) return dict[t];
  }
  return section === "meals" ? "Restaurant" : "Fitness Venue";
}

function formatDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function matchesGoalFilter(place: Place, filter: GoalFilter): boolean {
  if (filter === "all") return true;
  const types = place.types;
  const name = place.name.toLowerCase();
  if (filter === "high-protein") {
    // Prefer restaurants (protein-heavy cuisines) over snack/bakery/cafe
    const proteinTypes = ["restaurant", "japanese_restaurant", "indian_restaurant",
      "american_restaurant", "mediterranean_restaurant", "seafood_restaurant",
      "korean_restaurant", "mexican_restaurant", "steak_house", "meal_delivery",
      "meal_takeaway"];
    return types.some((t) => proteinTypes.includes(t));
  }
  if (filter === "low-calorie") {
    const lightTypes = ["vegetarian_restaurant", "vegan_restaurant", "sushi",
      "japanese_restaurant", "thai_restaurant", "vietnamese_restaurant"];
    const lightKeywords = ["salad", "sushi", "health", "vegan", "veggie", "poke",
      "bowl", "wrap", "fresh", "light", "green", "organic"];
    return (
      types.some((t) => lightTypes.includes(t)) ||
      lightKeywords.some((k) => name.includes(k))
    );
  }
  // balanced — everything qualifies
  return true;
}

function matchesVenueType(place: Place, filter: VenueTypeFilter): boolean {
  if (filter === "all") return true;
  const types = place.types;
  const name = place.name.toLowerCase();
  if (filter === "gym") return types.includes("gym") || types.includes("fitness_center") || types.includes("health");
  if (filter === "yoga") return types.includes("yoga_studio") || name.includes("yoga");
  if (filter === "pilates") return name.includes("pilates");
  if (filter === "crossfit") return name.includes("crossfit") || name.includes("cross fit");
  if (filter === "other") {
    return (
      !types.includes("gym") && !types.includes("fitness_center") && !types.includes("health") &&
      !types.includes("yoga_studio") && !name.includes("yoga") &&
      !name.includes("pilates") && !name.includes("crossfit")
    );
  }
  return true;
}

function matchesIntensity(place: Place, filter: IntensityFilter): boolean {
  if (filter === "all") return true;
  const types = place.types;
  const name = place.name.toLowerCase();
  if (filter === "low") {
    const lowTypes = ["yoga_studio", "spa", "swimming_pool"];
    const lowKw = ["yoga", "pilates", "swim", "stretch", "meditation", "wellness", "spa"];
    return types.some((t) => lowTypes.includes(t)) || lowKw.some((k) => name.includes(k));
  }
  if (filter === "high") {
    const highKw = ["crossfit", "cross fit", "hiit", "boxing", "martial arts",
      "karate", "judo", "muay thai", "kickboxing", "f45", "orangetheory"];
    return highKw.some((k) => name.includes(k));
  }
  // moderate = everything else (gym, fitness centre, sports complex, etc.)
  return true;
}

// ── Filter pill component ─────────────────────────────────────────────────────

function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
        active
          ? "bg-primary/15 border-primary/40 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
      }`}
    >
      {label}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const IdeasPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState<Section>(
    (searchParams.get("section") as Section) || "meals"
  );

  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("1000");

  // Meals filters
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
  const [goalFilter, setGoalFilter] = useState<GoalFilter>("all");

  // Activity filters
  const [venueTypeFilter, setVenueTypeFilter] = useState<VenueTypeFilter>("all");
  const [intensityFilter, setIntensityFilter] = useState<IntensityFilter>("all");

  const [insightText, setInsightText] = useState("");
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [insightLoading, setInsightLoading] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const mapsReadyRef = useRef(false);

  // ── Derived: available cuisine types from current results ─────────────────

  const availableCuisines = useMemo(() => {
    const labels = new Set<string>();
    for (const p of places) {
      const label = getTypeLabel(p.types, "meals");
      labels.add(label);
    }
    return Array.from(labels).sort();
  }, [places]);

  // ── Derived: filtered places ───────────────────────────────────────────────

  const filteredPlaces = useMemo(() => {
    if (section === "meals") {
      return places.filter((p) => {
        if (cuisineFilter !== "all") {
          const label = getTypeLabel(p.types, "meals");
          if (label !== cuisineFilter) return false;
        }
        return matchesGoalFilter(p, goalFilter);
      });
    } else {
      return places.filter((p) => {
        if (!matchesVenueType(p, venueTypeFilter)) return false;
        return matchesIntensity(p, intensityFilter);
      });
    }
  }, [places, section, cuisineFilter, goalFilter, venueTypeFilter, intensityFilter]);

  // ── Section switch ─────────────────────────────────────────────────────────

  const resetFilters = () => {
    setCuisineFilter("all");
    setGoalFilter("all");
    setVenueTypeFilter("all");
    setIntensityFilter("all");
  };

  const switchSection = (s: Section) => {
    setSection(s);
    setSearchParams({ section: s });
    setPlaces([]);
    setInsightText("");
    setExplanations({});
    resetFilters();
    if (location && mapsReadyRef.current) fetchPlaces(location, s, distanceFilter);
  };

  // ── Location ───────────────────────────────────────────────────────────────

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationStatus("denied"); return; }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  // ── Google Maps init ───────────────────────────────────────────────────────

  const initMap = useCallback((coords: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: coords,
      zoom: 15,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
      gestureHandling: "cooperative",
    });
    mapsReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (window.google) return;
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!location) return;
    const try_ = () => {
      if (window.google) {
        initMap(location);
        mapsReadyRef.current = true;
        fetchPlaces(location, section, distanceFilter);
      } else {
        setTimeout(try_, 250);
      }
    };
    setTimeout(try_, 300);
  }, [location]);

  // ── Update markers ─────────────────────────────────────────────────────────

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
          fillColor: "hsl(180, 65%, 55%)",
          fillOpacity: 1,
          strokeColor: "rgba(255,255,255,0.3)",
          strokeWeight: 2,
        },
      });
      return marker;
    });
    if (results.length > 0 && location) {
      mapInstanceRef.current!.setCenter(new window.google.maps.LatLng(location.lat, location.lng));
    }
  }, [location]);

  // ── Places API ─────────────────────────────────────────────────────────────

  const fetchPlaces = useCallback(
    (coords: { lat: number; lng: number }, sec: Section, radius: DistanceFilter) => {
      if (!window.google) return;
      setPlacesLoading(true);
      setPlacesError(null);
      setPlaces([]);
      resetFilters();

      const dummy = mapInstanceRef.current || (() => {
        const div = document.createElement("div");
        return new window.google.maps.Map(div, { center: coords, zoom: 15 });
      })();

      const service = new window.google.maps.places.PlacesService(dummy);
      const request: google.maps.places.PlaceSearchRequest = {
        location: new window.google.maps.LatLng(coords.lat, coords.lng),
        radius: parseInt(radius),
        type: sec === "meals" ? "restaurant" : "gym",
        rankBy: undefined,
      };

      service.nearbySearch(request, (results, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK && results
        ) {
          const mapped: Place[] = results.slice(0, 12).map((r) => ({
            place_id: r.place_id!,
            name: r.name!,
            vicinity: r.vicinity || "",
            rating: r.rating,
            user_ratings_total: (r as any).user_ratings_total,
            types: r.types || [],
            price_level: (r as any).price_level,
            geometry: {
              location: {
                lat: r.geometry!.location!.lat(),
                lng: r.geometry!.location!.lng(),
              },
            },
            distance: haversineMetres(
              coords.lat, coords.lng,
              r.geometry!.location!.lat(), r.geometry!.location!.lng()
            ),
          })).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

          setPlaces(mapped);
          updateMarkers(mapped);
          fetchInsight(mapped, sec);
        } else if (
          status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          setPlaces([]);
          setPlacesLoading(false);
        } else {
          setPlacesError("Could not fetch nearby places. Please retry.");
          setPlacesLoading(false);
        }
      });
    },
    [updateMarkers]
  );

  // ── AI Insight ─────────────────────────────────────────────────────────────

  const fetchInsight = async (results: Place[], sec: Section) => {
    if (!user || results.length === 0) { setPlacesLoading(false); return; }
    setInsightLoading(true);
    setPlacesLoading(false);
    try {
      const { data, error } = await supabase.functions.invoke("ideas-insight", {
        body: {
          section: sec,
          userId: user.id,
          places: results.slice(0, 8).map((p) => ({
            name: p.name,
            types: p.types,
            rating: p.rating,
            distance: p.distance,
          })),
        },
      });
      if (error) throw error;
      setInsightText(data.insight || "");
      setExplanations(data.explanations || {});
    } catch {
      setInsightText("");
      setExplanations({});
    } finally {
      setInsightLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const distanceLabel = distanceFilter === "1000" ? "1 km" : distanceFilter === "3000" ? "3 km" : "5 km";

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-5 pb-32">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ideas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Personalised recommendations near you</p>
      </div>

      {/* Section toggle */}
      <div className="flex gap-1 p-1 rounded-2xl bg-card border border-border">
        {([
          { key: "meals", label: "Meal Ideas", Icon: Utensils },
          { key: "activity", label: "Activity Ideas", Icon: Dumbbell },
        ] as { key: Section; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => switchSection(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
              section === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Location denied */}
      {locationStatus === "denied" && (
        <div className="surface-elevated p-8 flex flex-col items-center text-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Location access needed</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-xs mx-auto">
              Enable location to discover {section === "meals" ? "restaurants" : "fitness venues"} near you. Your location is only used during this session and never stored.
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

      {/* Requesting */}
      {locationStatus === "requesting" && (
        <div className="surface-elevated p-8 flex flex-col items-center text-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Getting your location…</p>
        </div>
      )}

      {/* Main content */}
      {locationStatus === "granted" && location && (
        <>
          {/* AI Insight */}
          <div className="surface-ai rounded-2xl p-4 shadow-glow-ai min-h-[72px]">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-metric-ai/15 shrink-0 mt-0.5">
                {insightLoading
                  ? <Loader2 className="h-4 w-4 text-metric-ai animate-spin" />
                  : <Sparkles className="h-4 w-4 text-metric-ai" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-metric-ai font-semibold mb-1">AI Insight</p>
                {insightLoading ? (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="h-3 rounded-full bg-metric-ai/10 w-full animate-pulse" />
                    <div className="h-3 rounded-full bg-metric-ai/10 w-2/3 animate-pulse" />
                  </div>
                ) : insightText ? (
                  <p className="text-sm text-foreground/90 leading-relaxed">{insightText}</p>
                ) : (
                  <p className="text-sm text-foreground/50 leading-relaxed">
                    {placesLoading
                      ? "Finding the best spots near you…"
                      : "Finding personalised recommendations…"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Distance filter + refresh */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["1000", "3000", "5000"] as DistanceFilter[]).map((d) => (
                <FilterPill
                  key={d}
                  label={d === "1000" ? "1 km" : d === "3000" ? "3 km" : "5 km"}
                  active={distanceFilter === d}
                  onClick={() => {
                    setDistanceFilter(d);
                    setPlaces([]);
                    setInsightText("");
                    setExplanations({});
                    fetchPlaces(location, section, d);
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => {
                setPlaces([]);
                setInsightText("");
                setExplanations({});
                fetchPlaces(location, section, distanceFilter);
              }}
              disabled={placesLoading || insightLoading}
              className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${(placesLoading || insightLoading) ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Secondary filters — only show when results are loaded */}
          {!placesLoading && places.length > 0 && (
            <div className="space-y-2">
              {section === "meals" ? (
                <>
                  {/* Cuisine type — dynamic from results */}
                  {availableCuisines.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                      <FilterPill label="All cuisine" active={cuisineFilter === "all"} onClick={() => setCuisineFilter("all")} />
                      {availableCuisines.map((c) => (
                        <FilterPill key={c} label={c} active={cuisineFilter === c} onClick={() => setCuisineFilter(c)} />
                      ))}
                    </div>
                  )}
                  {/* Goal alignment */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    <FilterPill label="Any goal" active={goalFilter === "all"} onClick={() => setGoalFilter("all")} />
                    <FilterPill label="High protein" active={goalFilter === "high-protein"} onClick={() => setGoalFilter("high-protein")} />
                    <FilterPill label="Low calorie" active={goalFilter === "low-calorie"} onClick={() => setGoalFilter("low-calorie")} />
                    <FilterPill label="Balanced" active={goalFilter === "balanced"} onClick={() => setGoalFilter("balanced")} />
                  </div>
                </>
              ) : (
                <>
                  {/* Venue type */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    <FilterPill label="All venues" active={venueTypeFilter === "all"} onClick={() => setVenueTypeFilter("all")} />
                    <FilterPill label="Gym" active={venueTypeFilter === "gym"} onClick={() => setVenueTypeFilter("gym")} />
                    <FilterPill label="Yoga" active={venueTypeFilter === "yoga"} onClick={() => setVenueTypeFilter("yoga")} />
                    <FilterPill label="Pilates" active={venueTypeFilter === "pilates"} onClick={() => setVenueTypeFilter("pilates")} />
                    <FilterPill label="CrossFit" active={venueTypeFilter === "crossfit"} onClick={() => setVenueTypeFilter("crossfit")} />
                    <FilterPill label="Other" active={venueTypeFilter === "other"} onClick={() => setVenueTypeFilter("other")} />
                  </div>
                  {/* Intensity */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    <FilterPill label="Any intensity" active={intensityFilter === "all"} onClick={() => setIntensityFilter("all")} />
                    <FilterPill label="Low" active={intensityFilter === "low"} onClick={() => setIntensityFilter("low")} />
                    <FilterPill label="Moderate" active={intensityFilter === "moderate"} onClick={() => setIntensityFilter("moderate")} />
                    <FilterPill label="High" active={intensityFilter === "high"} onClick={() => setIntensityFilter("high")} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Map */}
          <div className="rounded-2xl overflow-hidden border border-border relative" style={{ height: 220 }}>
            {placesLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
          </div>

          {/* Error */}
          {placesError && (
            <div className="surface-elevated p-4 flex items-center gap-3 rounded-2xl border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">{placesError}</p>
              <button
                onClick={() => fetchPlaces(location, section, distanceFilter)}
                className="text-xs font-semibold text-primary shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {placesLoading && (
            <div className="space-y-3">
              <div className="h-3 bg-muted rounded-full w-24 animate-pulse" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="surface-elevated p-4 space-y-3 animate-pulse">
                  <div className="flex justify-between">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-muted rounded-full w-2/5" />
                      <div className="h-3 bg-muted rounded-full w-3/5" />
                    </div>
                    <div className="h-4 bg-muted rounded-full w-12 shrink-0" />
                  </div>
                  <div className="h-3 bg-muted rounded-full w-full" />
                  <div className="h-5 bg-muted rounded-full w-20" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state — no results after filtering */}
          {!placesLoading && !placesError && places.length > 0 && filteredPlaces.length === 0 && (
            <div className="surface-elevated p-6 flex flex-col items-center text-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-muted">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">No matches for this filter</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Try a different combination or clear the filters.
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-primary"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Empty state — no places at all */}
          {!placesLoading && !placesError && places.length === 0 && (
            <div className="surface-elevated p-8 flex flex-col items-center text-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Nothing found nearby</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Try expanding the search radius to find more options.
                </p>
              </div>
              <button
                onClick={() => {
                  const next = distanceFilter === "1000" ? "3000" : "5000";
                  setDistanceFilter(next as DistanceFilter);
                  fetchPlaces(location, section, next as DistanceFilter);
                }}
                className="text-xs font-semibold text-primary"
              >
                Expand to {distanceFilter === "1000" ? "3 km" : "5 km"}
              </button>
            </div>
          )}

          {/* Place cards */}
          {!placesLoading && filteredPlaces.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">
                {filteredPlaces.length} {section === "meals" ? "restaurants" : "venues"} within {distanceLabel}
                {filteredPlaces.length < places.length && (
                  <span className="normal-case tracking-normal font-normal"> · {places.length - filteredPlaces.length} filtered out</span>
                )}
              </p>
              {filteredPlaces.map((place, idx) => (
                <PlaceCard
                  key={place.place_id}
                  place={place}
                  section={section}
                  explanation={explanations[place.name]}
                  explanationLoading={insightLoading}
                  rank={idx + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Place card ─────────────────────────────────────────────────────────────────

interface PlaceCardProps {
  place: Place;
  section: Section;
  explanation?: string;
  explanationLoading: boolean;
  rank: number;
}

function PlaceCard({ place, section, explanation, explanationLoading, rank }: PlaceCardProps) {
  const typeLabel = getTypeLabel(place.types, section);
  const colorToken = section === "meals" ? "--metric-calories" : "--metric-activity";

  return (
    <div className="surface-elevated p-4 space-y-3 transition-all duration-200 hover:border-border/80">
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 text-xs font-bold"
          style={{
            backgroundColor: `hsl(var(${colorToken}) / 0.12)`,
            color: `hsl(var(${colorToken}))`,
          }}
        >
          {rank}
        </div>

        {/* Name + address */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-tight">{place.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{place.vicinity}</p>
        </div>

        {/* Distance */}
        {place.distance !== undefined && (
          <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
            <Navigation className="h-3 w-3" />
            <span>{formatDistance(place.distance)}</span>
          </div>
        )}
      </div>

      {/* AI explanation */}
      <div className="pl-11">
        {explanationLoading ? (
          <div className="h-3 bg-muted/50 rounded-full w-4/5 animate-pulse" />
        ) : explanation ? (
          <p className="text-xs text-foreground/70 leading-relaxed">{explanation}</p>
        ) : null}
      </div>

      {/* Bottom row: type badge + rating */}
      <div className="pl-11 flex items-center justify-between">
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: `hsl(var(${colorToken}) / 0.10)`,
            color: `hsl(var(${colorToken}))`,
          }}
        >
          {typeLabel}
        </span>

        <div className="flex items-center gap-2">
          {place.price_level !== undefined && place.price_level > 0 && (
            <span className="text-[10px] text-muted-foreground tracking-wider">
              {"$".repeat(place.price_level)}
            </span>
          )}
          {place.rating && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
              <Star className="h-3 w-3 fill-amber-400 stroke-none" />
              {place.rating.toFixed(1)}
              {place.user_ratings_total && (
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({place.user_ratings_total > 999
                    ? `${(place.user_ratings_total / 1000).toFixed(1)}k`
                    : place.user_ratings_total})
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window { google: typeof google; }
}

export default IdeasPage;
