import { Link, useNavigate } from "react-router-dom";
import { Shield, Check, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useState } from "react";

const PricingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      tier: "free",
      features: [
        "Up to 5 scans/month",
        "Real security testing",
        "Email alerts",
        "Basic reporting",
        "Community support",
      ],
      comingSoon: [
        "PDF reports",
        "Full nuclei scans",
        "Priority support",
      ],
      cta: "Get Started",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For growing businesses",
      tier: "pro",
      features: [
        "Unlimited scans",
        "Real security testing",
        "Advanced threat detection",
        "Email alerts",
        "PDF & HTML reports",
        "Full nuclei scans",
        "Slack integration",
        "Email support",
      ],
      comingSoon: [
        "API access",
        "Custom templates",
      ],
      cta: "Upgrade to Pro",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      tier: "enterprise",
      features: [
        "Everything in Pro",
        "Unlimited everything",
        "Custom integrations",
        "Dedicated account manager",
        "24/7 phone support",
        "On-premise option",
        "SLA guarantee",
        "Advanced compliance",
      ],
      comingSoon: [
        "Custom security tests",
        "White-label option",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  const handleUpgrade = async (tier: string) => {
    if (!isAuthenticated) {
      navigate("/signup");
      return;
    }

    if (tier === "enterprise") {
      // Contact sales
      window.location.href = "mailto:sales@vulnguard.io?subject=Enterprise Plan Inquiry";
      return;
    }

    if (user?.planTier === tier) {
      toast.info("You already have this plan");
      return;
    }

    if (tier === "free") {
      navigate("/dashboard");
      return;
    }

    setLoading(true);
    try {
      // Create checkout session
      const response = await apiClient.createCheckoutSession(tier);
      if (response.data.sessionUrl) {
        window.location.href = response.data.sessionUrl;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      toast.error("Failed to initiate checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 border-b border-border/50 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <span className="text-xl font-semibold tracking-tight">
            Vuln<span className="text-primary">Guard</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="outline" size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="glow-primary">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Pricing Section */}
      <section className="px-6 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your security needs. Upgrade or downgrade anytime.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-6 mb-16">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.tier}
                className={`relative rounded-2xl border transition-all ${
                  plan.highlighted
                    ? "border-primary bg-primary/5 shadow-2xl scale-105"
                    : "border-border bg-card"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary px-4 py-1 rounded-full text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>

                  <Button
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={loading}
                    className={`w-full mb-8 ${
                      plan.highlighted ? "glow-primary" : ""
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {loading ? "Processing..." : plan.cta}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Features
                      </h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {plan.comingSoon && plan.comingSoon.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-3 text-muted-foreground">
                          Coming Soon
                        </h4>
                        <ul className="space-y-2">
                          {plan.comingSoon.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-sm text-muted-foreground opacity-60"
                            >
                              <div className="h-4 w-4 border border-dashed rounded flex-shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* FAQ or CTA */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-muted-foreground mb-4">Need help choosing a plan?</p>
            <a
              href="mailto:support@vulnguard.io"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              Contact our team
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
