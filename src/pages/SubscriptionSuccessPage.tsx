import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFriendlyError } from "@/lib/error-handler";

const SubscriptionSuccessPage = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifySession = async () => {
      try {
        if (sessionId) {
          // Verify the checkout session with backend
          await apiClient.verifyCheckoutSession(sessionId);
          await refreshUser();
        }
        toast.success("Subscription activated successfully!");
        setLoading(false);
      } catch (error) {
        console.error("Failed to verify session:", error);
        toast.error(getUserFriendlyError(error));
        setLoading(false);
      }
    };

    void verifySession();
  }, [refreshUser, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-accent mx-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Subscription Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for upgrading your VulnGuard subscription. You now have access to all premium features.
        </p>
        
        <div className="space-y-3 mb-8 text-left bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-accent" />
            <span>Unlimited scans per month</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-accent" />
            <span>PDF and HTML reports</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-accent" />
            <span>Full nuclei vulnerability scans</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-accent" />
            <span>Priority email support</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate("/dashboard")}
            className="glow-primary h-11"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/settings")}
          >
            View Subscription Settings
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Questions? Email us at{" "}
          <a href="mailto:support@vulnguard.io" className="text-primary hover:underline">
            support@vulnguard.io
          </a>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSuccessPage;
