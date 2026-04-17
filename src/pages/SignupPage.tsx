import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  validatePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
} from "@/lib/passwordValidator";

const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = validatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!passwordStrength.isValid) {
      toast.error("Password does not meet security requirements");
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password);
      toast.success("Account created successfully! Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl top-[-10%] left-[-5%]" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-accent/10 blur-3xl bottom-[-10%] right-[-5%]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-2xl font-semibold tracking-tight">
            Vuln<span className="text-primary">Guard</span>
          </span>
        </div>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Start scanning your e-commerce site for free</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Password Strength</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: getStrengthColor(passwordStrength.level) }}
                      >
                        {getStrengthLabel(passwordStrength.level)}
                      </span>
                    </div>
                    <Progress
                      value={passwordStrength.score}
                      className="h-2"
                      style={{
                        background: "#e2e8f0",
                      }}
                    />

                    {/* Requirements Feedback */}
                    {passwordStrength.feedback.length > 0 && (
                      <ul className="text-xs text-amber-600 space-y-1">
                        {passwordStrength.feedback.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    )}

                    {/* Success Message */}
                    {passwordStrength.isValid && (
                      <p className="text-xs text-green-600 font-medium">✓ Password meets security requirements</p>
                    )}
                  </div>
                )}

                {/* Instructions */}
                {!password && (
                  <p className="text-xs text-muted-foreground">
                    Password must contain:
                    <br />• 8+ characters • Uppercase letter • Lowercase letter • Number • Symbol
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full glow-primary h-11"
                disabled={loading || !passwordStrength.isValid}
              >
                {loading ? "Creating account..." : "Create Account"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
