import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Drumstick, Moon, Footprints, UtensilsCrossed, Dumbbell, RefreshCw } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";

const Index = () => {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "there";

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
              <p className="text-lg font-bold">—</p>
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
              <p className="text-lg font-bold">—</p>
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

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <UtensilsCrossed className="h-5 w-5" />
            <span className="text-xs">Log meal</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <Dumbbell className="h-5 w-5" />
            <span className="text-xs">Workout</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <RefreshCw className="h-5 w-5" />
            <span className="text-xs">Sync</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
