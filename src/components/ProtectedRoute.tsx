import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: ReactNode;
  requireSubscription?: boolean;
  requireOnboarding?: boolean;
};

const ProtectedRoute = ({ 
  children, 
  requireSubscription = true, 
  requireOnboarding = true 
}: ProtectedRouteProps) => {
  const { user, profile, subscription, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // No profile yet (still loading or trigger hasn't fired)
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check subscription: must be active or trialing
  if (requireSubscription) {
    const isSubscribed = subscription?.subscribed === true;
    const hasStripeSubscription = !!profile.stripe_subscription_id;
    
    if (!isSubscribed && !hasStripeSubscription) {
      return <Navigate to="/checkout" replace />;
    }
    
    // If has stripe sub but subscription check says not active (cancelled/expired)
    if (hasStripeSubscription && subscription && !subscription.subscribed) {
      return <Navigate to="/checkout" replace />;
    }
  }

  // Check onboarding
  if (requireOnboarding && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
