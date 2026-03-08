import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, Heart, Zap } from "lucide-react";
import somaLogo from "@/assets/soma-logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const { signIn, signUp, verifyOtp, user } = useAuth();
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
      } else if (otpStep) {
        await verifyOtp(email, otp.trim());
        toast.success("Email verified! Welcome to SOMA.");
        navigate("/");
      } else {
        await signUp(email, password, displayName);
        setOtpStep(true);
        toast.success("Check your email for a 6-digit verification code.");
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
          <img src={somaLogo} alt="SOMA" className="h-12 w-auto brightness-0 invert" />
          <p className="mt-2 text-primary-foreground/70">Your Adaptive Health Agent</p>
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
          © 2026 SOMA
        </p>
      </div>

      {/* Right side — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 lg:hidden">
              <img src={somaLogo} alt="SOMA" className="h-10 w-auto mx-auto" />
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? "Welcome back" : otpStep ? "Verify your email" : "Create account"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Sign in to your wellness dashboard"
                : otpStep
                ? `Enter the 6-digit code sent to ${email}`
                : "Start your health journey today"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {otpStep ? (
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : isLogin ? "Sign in" : otpStep ? "Verify email" : "Create account"}
              </Button>
              {otpStep ? (
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setOtpStep(false); setOtp(""); }}
                >
                  Back to sign up
                </button>
              ) : (
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
