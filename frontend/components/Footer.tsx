"use client";
import { HomeIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { GiftIcon, StoreIcon, FlaskConicalIcon } from "lucide-react";

const navItems = [
  { name: "Home", icon: HomeIcon, path: "/", ariaLabel: "Navigate to home" },
  { name: "Data & Airtime", icon: StoreIcon, path: "/utilityBills", ariaLabel: "Navigate to data and airtime" },
  { name: "Freebies", icon: GiftIcon, path: "/freebies", ariaLabel: "Navigate to freebies" },
  { name: "Beta", icon: FlaskConicalIcon, path: "/betaFeatures", ariaLabel: "Navigate to beta features" },
];

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <footer className="sm:hidden fixed bottom-0 w-full z-40 bg-white/80 dark:bg-neutral-950/80 border-t border-gray-100 dark:border-neutral-800">
      <div className="flex items-stretch justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              aria-label={item.ariaLabel}
              className="relative flex flex-col items-center gap-1 flex-1 focus:outline-none group"
            >
              {/* Active pill indicator at top */}
              <span
                className={cn(
                  "absolute -top-2 h-0.5 rounded-full transition-all duration-300",
                  active ? "w-6 bg-primary" : "w-0 bg-transparent"
                )}
              />

              {/* Icon container */}
              <div
                className="flex items-center justify-center w-10 h-9 rounded-2xl transition-all duration-200"
                
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active
                      ? "text-black dark:text-white stroke-[2px]"
                      : "text-gray-400 dark:text-gray-500 stroke-[1.5px] group-hover:text-gray-600 dark:group-hover:text-gray-300"
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] leading-none transition-colors duration-200 whitespace-nowrap",
                  active
                    ? "text-black dark:text-white font-semibold"
                    : "text-gray-400 dark:text-gray-500 font-normal group-hover:text-gray-600 dark:group-hover:text-gray-300"
                )}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}