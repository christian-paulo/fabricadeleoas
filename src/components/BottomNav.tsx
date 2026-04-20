import { Home, Dumbbell, Newspaper, TrendingUp, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Dumbbell, label: "Protocolo", path: "/treinos" },
  { icon: Newspaper, label: "Alcateia", path: "/feed", featured: true },
  { icon: TrendingUp, label: "Evolução", path: "/evolucao" },
  { icon: User, label: "Perfil", path: "/perfil" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-raised/95 border-t border-border backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex justify-around items-end h-18 max-w-lg mx-auto py-2">
        {navItems.map(({ icon: Icon, label, path, featured }) => {
          const active = location.pathname === path;

          if (featured) {
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1 px-2 -mt-7 group"
                aria-label={label}
              >
                <div
                  className={`w-14 h-14 rounded-full pink-gradient flex items-center justify-center shadow-lg shadow-primary/40 transition-transform ${
                    active ? "scale-110" : "group-hover:scale-105"
                  }`}
                >
                  <Icon size={24} strokeWidth={2.5} className="text-primary-foreground" />
                </div>
                <span className={`text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-2 py-2 transition-colors rounded-xl ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.8 : 2} />
              <span className={`text-[11px] font-semibold ${active ? "text-primary" : ""}`}>{label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
