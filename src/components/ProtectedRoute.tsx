import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  requireSubscription?: boolean;
  requireOnboarding?: boolean;
};

const ProtectedRoute = ({
  requireSubscription = true,
  requireOnboarding = true,
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

  if (requireOnboarding && !profile.onboarding_completed) {
    return <Navigate to="/onboarding/boas-vindas" replace />;
  }

  if (requireSubscription && subscription === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireSubscription && !subscription?.subscribed) {
    return <Navigate to="/onboarding/checkout" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
