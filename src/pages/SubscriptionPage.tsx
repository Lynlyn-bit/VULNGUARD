import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, CalendarClock, CreditCard, ExternalLink, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const planStyles = {
  free: "border-border bg-card text-foreground",
  pro: "border-primary/40 bg-primary/5 text-primary",
  enterprise: "border-accent/40 bg-accent/5 text-accent",
} as const;

const SubscriptionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentPlan = user?.planTier ?? "free";

  const planCards = useMemo(
    () => [
      {
        tier: "free",
        title: "Free",
        price: "$0",
        description: "Best for trying the scanner and reviewing lightweight web security findings.",
        highlights: ["Manual scans", "Saved reports", "Basic remediation guidance"],
      },
      {
        tier: "pro",
        title: "Pro",
        price: "$29/mo",
        description: "For teams that want more frequent scanning and richer reporting workflows.",
        highlights: ["Unlimited scans", "Priority support", "Improved reporting features"],
      },
      {
        tier: "enterprise",
        title: "Enterprise",
        price: "Custom",
        description: "For larger organizations that need tailored rollout and support.",
        highlights: ["Custom onboarding", "Account management", "Bespoke roadmap input"],
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscription</h1>
          <p className="text-sm text-muted-foreground">
            Review your current plan and see what billing controls are planned next.
          </p>
        </div>
        <Button onClick={() => navigate("/pricing")} className="w-full md:w-auto">
          Compare Plans
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Current Plan
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${planStyles[currentPlan]}`}>
                  {currentPlan}
                </div>
                <span className="text-sm text-muted-foreground capitalize">
                  Status: {user?.subscriptionStatus ?? "none"}
                </span>
              </div>
            </div>
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="h-4 w-4 text-primary" />
                Renewal
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {user?.currentPeriodEnd
                  ? `Current period ends on ${new Date(user.currentPeriodEnd).toLocaleDateString()}.`
                  : "No active renewal date is set for this account yet."}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 text-primary" />
                Billing Controls
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Payment method updates, invoices, and cancellation actions are planned but not live yet.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Billing management is coming soon
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              This page is intentionally read-only for now. It gives your users a dedicated place to review
              their plan without implying that self-serve billing is already active.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" disabled className="sm:w-auto">
                Update Payment Method
              </Button>
              <Button variant="outline" disabled className="sm:w-auto">
                Cancel Subscription
              </Button>
              <Button variant="outline" disabled className="sm:w-auto">
                Download Invoice
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Plan Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A simple summary of what each tier is meant to represent in the current product.
          </p>

          <div className="mt-5 space-y-3">
            {planCards.map((plan) => {
              const isCurrent = plan.tier === currentPlan;
              return (
                <div
                  key={plan.tier}
                  className={`rounded-lg border p-4 ${isCurrent ? planStyles[plan.tier] : "border-border bg-background"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{plan.title}</p>
                        {isCurrent && <BadgeCheck className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <span className="text-sm font-semibold">{plan.price}</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {plan.highlights.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SubscriptionPage;
