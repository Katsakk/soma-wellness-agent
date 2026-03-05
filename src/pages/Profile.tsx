import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LogOut, Target, Settings, Link, Loader2, Check, Pencil, Camera } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import GoalsDialog, { type GoalsData } from "@/components/profile/GoalsDialog";

const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Keto", "Paleo", "Gluten-Free", "Dairy-Free", "Low-Carb", "High-Protein"];
const WORKOUT_OPTIONS = ["Running", "Cycling", "Swimming", "Yoga", "HIIT", "Strength Training", "Pilates", "CrossFit", "Boxing", "Walking"];
const UNIT_OPTIONS = [
  { value: "metric", label: "Metric (kg, cm)" },
  { value: "imperial", label: "Imperial (lbs, in)" },
];

const GOAL_TYPE_LABELS: Record<string, string> = {
  weight_loss: "🔥 Weight Loss",
  fat_burn: "💪 Fat Burn",
  maintenance: "⚖️ Maintenance",
  muscle_gain: "🏋️ Muscle Gain",
};

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
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [existingGoalId, setExistingGoalId] = useState<string | null>(null);

  const [prefs, setPrefs] = useState({ dietary_preferences: [] as string[], workout_preferences: [] as string[], units: "metric" });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Load profile
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfileData({ display_name: data.display_name || "", avatar_url: data.avatar_url || null });
      } else {
        setProfileData({ display_name: user.user_metadata?.display_name || user.email || "", avatar_url: null });
      }
      setProfileLoaded(true);
    });
    // Load goals
    supabase.from("goals").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as any;
        setGoals({
          goal_type: d.goal_type || "maintenance",
          target_calories: d.target_calories?.toString() || "", target_protein: d.target_protein?.toString() || "",
          target_carbs: d.target_carbs?.toString() || "", target_fats: d.target_fats?.toString() || "",
          target_weight: d.target_weight?.toString() || "", current_weight: d.current_weight?.toString() || "",
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
      else { const { error } = await supabase.from("preferences").insert(payload); if (error) throw error; }
      toast.success("Preferences saved!"); setPrefsOpen(false);
    } catch (e: any) { toast.error(e.message || "Failed to save preferences"); }
    finally { setPrefsSaving(false); }
  };

  const togglePref = (list: string[], item: string) => list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  const handleSignOut = async () => { await signOut(); toast.success("Signed out"); navigate("/auth"); };

  const hasGoals = goalsLoaded && (goals.target_calories || goals.target_protein);
  const bmi = useMemo(() => {
    const w = parseFloat(goals.current_weight), h = parseFloat(goals.height);
    if (!w || !h) return null;
    return parseFloat((w / ((h / 100) ** 2)).toFixed(1));
  }, [goals.current_weight, goals.height]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16">
            {profileData.avatar_url && <AvatarImage src={profileData.avatar_url} alt={displayName} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={openEditProfile} className="shrink-0">
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {/* Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {!goalsLoaded ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : hasGoals ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="text-xs">{GOAL_TYPE_LABELS[goals.goal_type] || goals.goal_type}</Badge>
                <Badge variant="outline" className="text-xs">{goals.exercise_days_per_week}x/week</Badge>
                <Badge variant="outline" className="text-xs capitalize">{goals.gender}, {goals.age}y</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {goals.target_calories && <div className="rounded-lg bg-muted p-2"><p className="text-[10px] text-muted-foreground">Calories</p><p className="font-semibold">{goals.target_calories} kcal</p></div>}
                {goals.target_protein && <div className="rounded-lg bg-muted p-2"><p className="text-[10px] text-muted-foreground">Protein</p><p className="font-semibold">{goals.target_protein}g</p></div>}
                {goals.target_carbs && <div className="rounded-lg bg-muted p-2"><p className="text-[10px] text-muted-foreground">Carbs</p><p className="font-semibold">{goals.target_carbs}g</p></div>}
                {goals.target_fats && <div className="rounded-lg bg-muted p-2"><p className="text-[10px] text-muted-foreground">Fats</p><p className="font-semibold">{goals.target_fats}g</p></div>}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                {goals.current_weight && <span>Current: {goals.current_weight} kg</span>}
                {goals.target_weight && <span>Target: {goals.target_weight} kg</span>}
                {bmi && <span>BMI: {bmi}</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No goals set yet. Set your health goals to get personalized recommendations.</p>
          )}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setGoalsOpen(true)}>
            {hasGoals ? "Edit goals" : "Set goals"}
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Preferences</CardTitle></CardHeader>
        <CardContent>
          {!prefsLoaded ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : prefs.dietary_preferences.length > 0 || prefs.workout_preferences.length > 0 ? (
            <div className="space-y-2">
              {prefs.dietary_preferences.length > 0 && (<div><p className="text-[10px] text-muted-foreground mb-1">Diet</p><div className="flex flex-wrap gap-1">{prefs.dietary_preferences.map((d) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}</div></div>)}
              {prefs.workout_preferences.length > 0 && (<div><p className="text-[10px] text-muted-foreground mb-1">Workouts</p><div className="flex flex-wrap gap-1">{prefs.workout_preferences.map((w) => <Badge key={w} variant="secondary" className="text-xs">{w}</Badge>)}</div></div>)}
              <p className="text-xs text-muted-foreground">Units: {prefs.units === "metric" ? "Metric" : "Imperial"}</p>
            </div>
          ) : <p className="text-sm text-muted-foreground">Configure your dietary and workout preferences.</p>}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setPrefsOpen(true)}>Edit preferences</Button>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Link className="h-4 w-4" /> Integrations</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Connect Gmail, Strava, and Oura to sync your health data.</p>
          <Button variant="outline" size="sm" className="mt-3">Manage integrations</Button>
        </CardContent>
      </Card>

      <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>

      {user && <GoalsDialog open={goalsOpen} onOpenChange={setGoalsOpen} userId={user.id} initialData={goals} existingGoalId={existingGoalId} onSaved={(data, goalId) => { setGoals(data); setExistingGoalId(goalId); }} />}

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-20 w-20">
                  {editAvatarPreview && <AvatarImage src={editAvatarPreview} alt="Preview" />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline">Change photo</button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Display Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" className="mt-1" />
            </div>
            <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full">
              {profileSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Preferences</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground">Dietary Preferences</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {DIETARY_OPTIONS.map((opt) => {
                  const selected = prefs.dietary_preferences.includes(opt);
                  return (<button key={opt} onClick={() => setPrefs({ ...prefs, dietary_preferences: togglePref(prefs.dietary_preferences, opt) })} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>{selected && <Check className="h-3 w-3 inline mr-1" />}{opt}</button>);
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Workout Preferences</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {WORKOUT_OPTIONS.map((opt) => {
                  const selected = prefs.workout_preferences.includes(opt);
                  return (<button key={opt} onClick={() => setPrefs({ ...prefs, workout_preferences: togglePref(prefs.workout_preferences, opt) })} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>{selected && <Check className="h-3 w-3 inline mr-1" />}{opt}</button>);
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Units</Label>
              <div className="flex gap-2 mt-2">
                {UNIT_OPTIONS.map((opt) => (<button key={opt.value} onClick={() => setPrefs({ ...prefs, units: opt.value })} className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-1 ${prefs.units === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>{opt.label}</button>))}
              </div>
            </div>
            <Button onClick={handleSavePrefs} disabled={prefsSaving} className="w-full">
              {prefsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
