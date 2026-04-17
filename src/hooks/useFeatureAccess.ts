import { useAuth } from "@/contexts/AuthContext";

/**
 * Feature-gated features based on subscription tier
 */
export type FeatureName =
  | "PDFReports"
  | "FullNucleiScans"
  | "SlackIntegration"
  | "APIAccess"
  | "UnlimitedScans"
  | "PrioritySupport";

const FEATURE_TIERS: Record<FeatureName, ('free' | 'pro' | 'enterprise')[]> = {
  PDFReports: ['pro', 'enterprise'],
  FullNucleiScans: ['pro', 'enterprise'],
  SlackIntegration: ['pro', 'enterprise'],
  APIAccess: ['enterprise'],
  UnlimitedScans: ['pro', 'enterprise'],
  PrioritySupport: ['pro', 'enterprise'],
};

/**
 * Hook to check if user has access to a feature
 * @param featureName - The feature to check
 * @returns boolean indicating if user has access
 */
export function useFeatureAccess(featureName: FeatureName): boolean {
  const { user } = useAuth();

  if (!user) return false;

  const allowedTiers = FEATURE_TIERS[featureName];
  const userTier = user.planTier || 'free';

  return (
    user.subscriptionStatus === 'active' &&
    allowedTiers.includes(userTier as 'free' | 'pro' | 'enterprise')
  );
}

/**
 * Hook to get subscription info
 */
export function useSubscription() {
  const { user } = useAuth();

  return {
    isPro: user?.planTier === 'pro' && user?.subscriptionStatus === 'active',
    isEnterprise: user?.planTier === 'enterprise' && user?.subscriptionStatus === 'active',
    isFree: user?.planTier === 'free' || user?.subscriptionStatus !== 'active',
    planTier: user?.planTier || 'free',
    subscriptionStatus: user?.subscriptionStatus || 'none',
    currentPeriodEnd: user?.currentPeriodEnd,
  };
}

/**
 * Component wrapper for feature-gated content
 */
interface FeatureGateProps {
  feature: FeatureName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const hasAccess = useFeatureAccess(feature);

  if (!hasAccess) {
    return (
      <>
        {fallback || (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              This feature is available only on Pro and Enterprise plans.
            </p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
