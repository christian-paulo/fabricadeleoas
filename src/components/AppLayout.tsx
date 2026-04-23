import { ReactNode } from "react";
import BottomNav from "./BottomNav";

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <main className="bottom-nav-safe px-4 pt-6" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)" }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
