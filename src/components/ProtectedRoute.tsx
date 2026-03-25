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

  // Still loading auth state
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

  // Profile not yet loaded — wait
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check subscription (only if subscription data has loaded)
  if (requireSubscription && subscription !== null) {
    if (!subscription.subscribed) {
      return <Navigate to="/checkout" replace />;
    }
  }

  // If subscription is still null (loading), wait instead of redirecting
  if (requireSubscription && subscription === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check onboarding
  if (requireOnboarding && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
