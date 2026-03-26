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

  if (!user) return <Navigate to="/auth" replace />;

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check onboarding first (quiz needs to be done before subscription check)
  if (requireOnboarding && !profile.onboarding_completed) {
    return <Navigate to="/onboarding/motivacao" replace />;
  }

  // Check subscription
  if (requireSubscription && subscription !== null) {
    if (!subscription.subscribed) {
      return <Navigate to="/onboarding/checkout" replace />;
    }
  }

  if (requireSubscription && subscription === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
