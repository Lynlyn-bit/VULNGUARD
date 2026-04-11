import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

const SignupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Account created successfully!");
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" placeholder="Doe" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company name</Label>
                <Input id="company" placeholder="Acme Store" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" required minLength={8} />
              </div>
              <Button type="submit" className="w-full glow-primary h-11" disabled={loading}>
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
