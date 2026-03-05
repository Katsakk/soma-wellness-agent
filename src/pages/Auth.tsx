import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, Heart, Zap } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success("Welcome back!");
        navigate("/");
      } else {
        await signUp(email, password, displayName);
        toast.success("Account created! Check your email to confirm.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adaptive Health</h1>
          <p className="mt-1 text-primary-foreground/70">Your AI wellness coach</p>
        </div>
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary-foreground/10 p-3">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Unified Health Data</h3>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Connect Strava, Oura, and more. All your data in one place.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary-foreground/10 p-3">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Adaptive Coaching</h3>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Personalized daily guidance that evolves with your habits.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary-foreground/10 p-3">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI-Powered Insights</h3>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Ask anything about your nutrition, workouts, and recovery.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-primary-foreground/40">
          © 2026 Adaptive Health Agent
        </p>
      </div>

      {/* Right side — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
              <Activity className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">{isLogin ? "Welcome back" : "Create account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to your wellness dashboard" : "Start your health journey today"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : isLogin ? "Sign in" : "Create account"}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
