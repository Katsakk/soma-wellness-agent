import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LogOut, Target, Settings, Link, Loader2, Check, Pencil, Camera } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import GoalsDialog, { type GoalsData } from "@/components/profile/GoalsDialog";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";
import { useStravaIntegration } from "@/hooks/useStravaIntegration";

const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Keto", "Paleo", "Gluten-Free", "Dairy-Free", "Low-Carb", "High-Protein"];
const WORKOUT_OPTIONS = ["Running", "Cycling", "Swimming", "Yoga", "HIIT", "Strength Training", "Pilates", "CrossFit", "Boxing", "Walking"];
const UNIT_OPTIONS = [
  { value: "metric",   label: "Metric (kg, cm)" },
  { value: "imperial", label: "Imperial (lbs, in)" },
];

const GOAL_TYPE_LABELS: Record<string, string> = {
  weight_loss: "Weight Loss",
  fat_burn:    "Fat Burn",
  maintenance: "Maintenance",
  muscle_gain: "Muscle Gain",
};

const MACRO_CELLS = [
  { key: "target_calories" as const, label: "Calories", unit: "kcal", colorToken: "--metric-calories" },
  { key: "target_protein"  as const, label: "Protein",  unit: "g",    colorToken: "--metric-protein"  },
  { key: "target_carbs"    as const, label: "Carbs",    unit: "g",    colorToken: "--metric-carbs"    },
  { key: "target_fats"     as const, label: "Fat",      unit: "g",    colorToken: "--metric-fat"      },
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<{ display_name: string; avatar_url: string | null }>({
    display_name: "", avatar_url: null,
  });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = profileData.display_name || user?.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const [goals, setGoals] = useState<GoalsData>({
    goal_type: "maintenance", target_calories: "", target_protein: "", target_carbs: "", target_fats: "",
    target_weight: "", current_weight: "", height: "", exercise_days_per_week: 3, gender: "male", age: "30",
  });
  const [goalsLoaded, setGoalsLoaded]   = useState(false);
  const [goalsOpen, setGoalsOpen]       = useState(false);
  const [existingGoalId, setExistingGoalId] = useState<string | null>(null);

  const [prefs, setPrefs]         = useState({ dietary_preferences: [] as string[], workout_preferences: [] as string[], units: "metric" });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsOpen, setPrefsOpen]     = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, string>>({});
  const gmail  = useGmailIntegration();
  const strava = useStravaIntegration();

  // Handle OAuth popup callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected" && window.opener) {
      window.opener.postMessage({ type: "gmail-connected" }, window.location.origin);
      window.close();
    }
    if (params.get("strava") === "connected" && window.opener) {
      window.opener.postMessage({ type: "strava-connected" }, window.location.origin);
      window.close();
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setProfileData({
        display_name: data?.display_name || user.user_metadata?.display_name || user.email || "",
        avatar_url: data?.avatar_url || null,
      });
      setProfileLoaded(true);
    });
    supabase.from("goals").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as any;
        setGoals({
          goal_type: d.goal_type || "maintenance",
          target_calories: d.target_calories?.toString() || "", target_protein: d.target_protein?.toString() || "",
          target_carbs: d.target_carbs?.toString() || "",       target_fats: d.target_fats?.toString() || "",
          target_weight: d.target_weight?.toString() || "",     current_weight: d.current_weight?.toString() || "",
          height: d.height?.toString() || "", exercise_days_per_week: d.exercise_days_per_week ?? 3,
          gender: d.gender || "male", age: d.age?.toString() || "30",
        });
        setExistingGoalId(d.id);
      }
      setGoalsLoaded(true);
    });
    supabase.from("preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setPrefs({ dietary_preferences: data.dietary_preferences || [], workout_preferences: data.workout_preferences || [], units: data.units || "metric" });
      setPrefsLoaded(true);
    });
    supabase.from("integrations").select("provider, status").eq("user_id", user.id).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((i) => { map[i.provider] = i.status || "disconnected"; });
        setConnectedIntegrations(map);
      }
    });
  }, [user]);

  const openEditProfile = () => {
    setEditName(profileData.display_name);
    setEditAvatarPreview(profileData.avatar_url);
    setEditAvatarFile(null);
    setEditProfileOpen(true);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      let avatarUrl = profileData.avatar_url;
      if (editAvatarFile) {
        const ext = editAvatarFile.name.split(".").pop();
        const filePath = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, editAvatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }
      const payload = { display_name: editName.trim() || null, avatar_url: avatarUrl };
      const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("profiles").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({ user_id: user.id, ...payload });
        if (error) throw error;
      }
      setProfileData({ display_name: editName.trim(), avatar_url: avatarUrl });
      toast.success("Profile updated!");
      setEditProfileOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setPrefsSaving(true);
    try {
      const payload = { user_id: user.id, dietary_preferences: prefs.dietary_preferences, workout_preferences: prefs.workout_preferences, units: prefs.units };
      const { data: existing } = await supabase.from("preferences").select("id").eq("user_id", user.id).maybeSingle();
      if (existing) { const { error } = await supabase.from("preferences").update(payload).eq("id", existing.id); if (error) throw error; }
      else           { const { error } = await supabase.from("preferences").insert(payload); if (error) throw error; }
      toast.success("Preferences saved!");
      setPrefsOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  };

  const togglePref = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const handleSignOut = async () => { await signOut(); toast.success("Signed out"); navigate("/auth"); };

  const hasGoals = goalsLoaded && (goals.target_calories || goals.target_protein);

  const bmi = useMemo(() => {
    const w = parseFloat(goals.current_weight), h = parseFloat(goals.height);
    if (!w || !h) return null;
    return parseFloat((w / ((h / 100) ** 2)).toFixed(1));
  }, [goals.current_weight, goals.height]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6 pb-32">

      {/* ── Profile header ─────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            {profileData.avatar_url && <AvatarImage src={profileData.avatar_url} alt={displayName} />}
            <AvatarFallback className="bg-primary/15 text-primary text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{displayName}</h1>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
        <button
          onClick={openEditProfile}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-secondary transition-colors shrink-0"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* ── Goals ──────────────────────────────────────────────── */}
      <section className="surface-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Goals</span>
          </div>
          <button
            onClick={() => setGoalsOpen(true)}
            className="text-xs text-primary hover:underline font-medium"
          >
            {hasGoals ? "Edit" : "Set goals"}
          </button>
        </div>

        {!goalsLoaded ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : hasGoals ? (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {GOAL_TYPE_LABELS[goals.goal_type] || goals.goal_type}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                {goals.exercise_days_per_week}x / week
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground capitalize">
                {goals.gender}, {goals.age}y
              </span>
              {bmi && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  BMI {bmi}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MACRO_CELLS.map(({ key, label, unit, colorToken }) =>
                goals[key] ? (
                  <div key={key} className="rounded-xl bg-secondary p-3 space-y-0.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
                    <p className="text-sm font-bold" style={{ color: `hsl(var(${colorToken}))` }}>
                      {goals[key]}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
                    </p>
                  </div>
                ) : null
              )}
            </div>
            {(goals.current_weight || goals.target_weight) && (
              <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                {goals.current_weight && <span>Current: {goals.current_weight} kg</span>}
                {goals.target_weight  && <span>Target: {goals.target_weight} kg</span>}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set your health goals to get personalized recommendations.
          </p>
        )}
      </section>

      {/* ── Preferences ────────────────────────────────────────── */}
      <section className="surface-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Settings className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Preferences</span>
          </div>
          <button onClick={() => setPrefsOpen(true)} className="text-xs text-primary hover:underline font-medium">
            Edit
          </button>
        </div>

        {!prefsLoaded ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : prefs.dietary_preferences.length > 0 || prefs.workout_preferences.length > 0 ? (
          <div className="space-y-3">
            {prefs.dietary_preferences.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Diet</p>
                <div className="flex flex-wrap gap-1.5">
                  {prefs.dietary_preferences.map((d) => (
                    <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground/80">{d}</span>
                  ))}
                </div>
              </div>
            )}
            {prefs.workout_preferences.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Workouts</p>
                <div className="flex flex-wrap gap-1.5">
                  {prefs.workout_preferences.map((w) => (
                    <span key={w} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground/80">{w}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Units: {prefs.units === "metric" ? "Metric (kg, cm)" : "Imperial (lbs, in)"}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Configure your dietary and workout preferences.</p>
        )}
      </section>

      {/* ── Integrations ───────────────────────────────────────── */}
      <section className="surface-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <Link className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Integrations</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: "gmail",
              name: "Gmail",
              logo: "/logos/gmail.svg",
              isConnected: gmail.status === "connected",
              isLoading: gmail.status === "loading",
              onClick: () => gmail.status === "connected" ? gmail.disconnect() : gmail.connect("/profile"),
            },
            {
              id: "strava",
              name: "Strava",
              logo: "/logos/strava.svg",
              isConnected: strava.status === "connected",
              isLoading: strava.status === "loading",
              onClick: () => strava.status === "connected" ? strava.disconnect() : strava.connect("/profile"),
            },
            {
              id: "oura",
              name: "Oura",
              logo: "/logos/oura.png",
              isConnected: false,
              isLoading: false,
              onClick: () => toast.info("Oura integration coming soon!"),
            },
          ].map((int) => (
            <button
              key={int.id}
              onClick={int.onClick}
              disabled={int.isLoading}
              className="relative flex flex-col items-center gap-2 rounded-xl bg-secondary border border-border p-4 hover:bg-secondary/70 transition-colors disabled:opacity-50"
            >
              <div className="rounded-xl bg-card p-2.5">
                <img src={int.logo} alt={int.name} className="h-5 w-5 object-contain" />
              </div>
              <span className="text-xs font-medium text-foreground/80">{int.name}</span>
              <span className={`absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                int.isConnected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${int.isConnected ? "bg-success" : "bg-muted-foreground/50"}`} />
                {int.isConnected ? "On" : "Off"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Sign out ────────────────────────────────────────────── */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      {user && (
        <GoalsDialog
          open={goalsOpen}
          onOpenChange={setGoalsOpen}
          userId={user.id}
          initialData={goals}
          existingGoalId={existingGoalId}
          onSaved={(data, goalId) => { setGoals(data); setExistingGoalId(goalId); }}
        />
      )}

      {/* Edit Profile */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-20 w-20">
                  {editAvatarPreview && <AvatarImage src={editAvatarPreview} alt="Preview" />}
                  <AvatarFallback className="bg-primary/15 text-primary text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline">
                Change photo
              </button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Display Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" className="mt-1" />
            </div>
            <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full">
              {profileSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preferences */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Preferences</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground">Dietary Preferences</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {DIETARY_OPTIONS.map((opt) => {
                  const selected = prefs.dietary_preferences.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => setPrefs({ ...prefs, dietary_preferences: togglePref(prefs.dietary_preferences, opt) })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3 inline mr-1" />}{opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Workout Preferences</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {WORKOUT_OPTIONS.map((opt) => {
                  const selected = prefs.workout_preferences.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => setPrefs({ ...prefs, workout_preferences: togglePref(prefs.workout_preferences, opt) })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3 inline mr-1" />}{opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Units</Label>
              <div className="flex gap-2 mt-2">
                {UNIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrefs({ ...prefs, units: opt.value })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-1 ${
                      prefs.units === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleSavePrefs} disabled={prefsSaving} className="w-full">
              {prefsSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
