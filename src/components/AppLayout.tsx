import { NavLink, Outlet } from "react-router-dom";
import { Home, UtensilsCrossed, Dumbbell, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import somaLogo from "@/assets/soma-logo.png";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/meals", icon: UtensilsCrossed, label: "Meals" },
  { to: "/activity", icon: Dumbbell, label: "Activity" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-20 md:pb-0 md:pl-20">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/80 backdrop-blur-lg md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav className="fixed left-0 top-0 bottom-0 z-50 hidden w-20 flex-col items-center border-r bg-card/80 backdrop-blur-lg py-6 md:flex">
        <div className="mb-8">
          <img src={somaLogo} alt="SOMA" className="h-10 w-10 object-contain" />
        </div>
        <div className="flex flex-1 flex-col items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 text-xs transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
