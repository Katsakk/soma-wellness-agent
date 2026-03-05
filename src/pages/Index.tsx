import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Drumstick, Moon, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChatInterface from "@/components/ChatInterface";

const Index = () => {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "there";
  const [totals, setTotals] = useState({ calories: 0, protein: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    supabase
      .from("meals")
      .select("calories, protein")
      .eq("user_id", user.id)
      .gte("meal_time", todayStart.toISOString())
      .then(({ data }) => {
        if (data) {
          setTotals({
            calories: data.reduce((s, m) => s + (m.calories || 0), 0),
            protein: data.reduce((s, m) => s + (Number(m.protein) || 0), 0),
          });
        }
        setLoaded(true);
      });
  }, [user]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hey {firstName} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your health snapshot for today.</p>
      </div>

      {/* Daily summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Calories</p>
              <p className="text-lg font-bold">{loaded ? (totals.calories || "—") : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/10">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <Drumstick className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Protein</p>
              <p className="text-lg font-bold">{loaded ? (totals.protein ? `${Math.round(totals.protein)}g` : "—") : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-muted p-2">
              <Footprints className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Steps</p>
              <p className="text-lg font-bold">—</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-muted p-2">
              <Moon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sleep</p>
              <p className="text-lg font-bold">—</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat */}
      <ChatInterface />

    </div>
  );
};

export default Index;
