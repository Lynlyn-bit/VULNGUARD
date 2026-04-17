import { useNavigate } from "react-router-dom";
import { XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SubscriptionCancelPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Checkout Canceled</h1>
        <p className="text-muted-foreground mb-8">
          Your checkout session was canceled. No charges have been made to your account.
        </p>

        <div className="bg-card rounded-lg p-6 border border-border mb-8 text-left">
          <h3 className="font-semibold mb-4">What happened?</h3>
          <p className="text-sm text-muted-foreground">
            You were redirected away from the checkout page before completing your purchase. 
            If this was intentional, no action is needed. If you'd like to try upgrading again, 
            you can return to the pricing page anytime.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate("/pricing")}
            className="glow-primary h-11"
          >
            Return to Pricing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Having trouble? Contact our support team at{" "}
          <a href="mailto:support@vulnguard.io" className="text-primary hover:underline">
            support@vulnguard.io
          </a>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionCancelPage;
