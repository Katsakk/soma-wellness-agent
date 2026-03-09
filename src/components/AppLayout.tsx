import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Utensils, Dumbbell, Lightbulb, User } from "lucide-react";
import { cn } from "@/lib/utils";
import somaLogo from "@/assets/soma-logo.png";

const navItems = [
  { to: "/",         icon: LayoutDashboard, label: "Dashboard" },
  { to: "/meals",    icon: Utensils,        label: "Food" },
  { to: "/activity", icon: Dumbbell,        label: "Activity" },
  { to: "/ideas",    icon: Lightbulb,       label: "Ideas" },
  { to: "/profile",  icon: User,            label: "Profile" },
];

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-24 md:pb-0 md:pl-20">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="absolute inset-0 bg-card/80 backdrop-blur-xl border-t border-border" />
        <div className="relative flex items-center justify-around px-2 py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[56px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/10"
                  )}>
                    <item.icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.2px]")} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium tracking-wide",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Desktop side nav ──────────────────────────────────── */}
      <nav className="fixed left-0 top-0 bottom-0 z-50 hidden w-20 md:flex flex-col items-center">
        <div className="absolute inset-0 bg-card/60 backdrop-blur-xl border-r border-border" />
        <div className="relative flex flex-col items-center w-full h-full py-6">
          <div className="mb-6 px-2">
            <img src={somaLogo} alt="SOMA" className="h-9 w-9 object-contain" />
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 w-full px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center gap-1 w-full py-3 rounded-xl text-[10px] font-medium tracking-wide transition-all duration-200",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                    <item.icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.2px]")} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};
