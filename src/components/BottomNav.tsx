import { Home, Dumbbell, TrendingUp, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Dumbbell, label: "Treino", path: "/treinos" },
  { icon: TrendingUp, label: "Evolução", path: "/evolucao" },
  { icon: User, label: "Perfil", path: "/perfil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-all relative ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {active && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <Icon size={24} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[11px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
