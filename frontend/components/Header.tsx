"use client";

import { useState, useEffect, useRef, useContext } from "react";
import { ethers } from "ethers";
import { contractAddress, abi } from "../utils/abi";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MagnifyingGlassIcon,
  BellAlertIcon,
  ChevronDownIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { ThemeContext } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { requestEIP6963Providers } from "@/lib/eip6963Provider";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ReceiptsMini from "@/components/receipts/ReceiptsMini";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client, activeChain } from "../lib/thirdweb";
import { useActiveAccount } from "thirdweb/react";
import {
  HomeIcon,
  DatabaseIcon,
  ArrowLeftRightIcon,
  GiftIcon,
  FlaskConicalIcon,
  MessageCircleIcon,
  BookOpenIcon,
  PhoneIcon,
  HelpCircleIcon,
  BriefcaseIcon,
  UserIcon,
  ShieldIcon,
  ChevronRightIcon,
} from "lucide-react";
import { link } from "fs/promises";

const hardcodedAdmin = "0x5b2e388403b60972777873e359a5D04a832836b3".toLowerCase();

const navLinks = [
  { title: "Data & Airtime", href: "/utilityBills", icon: DatabaseIcon },
  { title: "Swap", href: "/swap", icon: ArrowLeftRightIcon },
  { title: "Freebies", href: "/freebies", icon: GiftIcon },
  { title: "Beta", href: "/betaFeatures", icon: FlaskConicalIcon },
  { title: "Chat", href: "/chat", icon: MessageCircleIcon },
];

const aboutMenuItems = [
  { title: "Blog", href: "/blogs", icon: BookOpenIcon },
  { title: "Contact Us", href: "/contact", icon: PhoneIcon },
  { title: "FAQ", href: "/faq", icon: HelpCircleIcon },
  { title: "Jobs", href: "/jobs", icon: BriefcaseIcon },
  { title: "Profile", href: "/profile", icon: UserIcon },
];

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const account = useActiveAccount();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const walletAddress = account?.address || null;
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    async function checkAdmin() {
      setCheckingAdmin(true);
      try {
        if (!walletAddress) { setIsAdmin(false); setCheckingAdmin(false); return; }
        const ethereum = (window as any).ethereum;
        if (!ethereum) { setIsAdmin(false); setCheckingAdmin(false); return; }
        const provider = new ethers.BrowserProvider(ethereum);
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const owner = await contract.owner();
        setIsAdmin(
          walletAddress.toLowerCase() === owner.toLowerCase() ||
          walletAddress.toLowerCase() === hardcodedAdmin
        );
      } catch { setIsAdmin(false); }
      finally { setCheckingAdmin(false); }
    }
    checkAdmin();
  }, [walletAddress]);

  useEffect(() => {
    const detectProviders = async () => {
      try {
        const providers = await requestEIP6963Providers();
        if (providers.length > 0) console.log("Available EIP-6963 providers:", providers.map(p => ({ name: p.info.name, rdns: p.info.rdns })));
      } catch { }
    };
    detectProviders();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-black/80 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Image
            className="cursor-pointer transition-all duration-300 hover:scale-105"
            src="/esusu.png"
            priority
            width={40}
            height={40}
            alt="EsusuLogo"
            onClick={() => router.push("/")}
          />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <NavigationMenu>
              <NavigationMenuList>
                {navLinks.map((link) => (
                  <NavigationMenuItem key={link.title}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "dark:text-primary hover:bg-primary/10 hover:text-primary transition-all duration-300",
                          pathname === link.href && "text-primary border-b-2 border-primary"
                        )}
                      >
                        {link.title}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}

                {!checkingAdmin && isAdmin && walletAddress && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="/admin-panel"
                      className={cn(
                        "h-9 px-4 font-semibold rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all",
                        pathname === "/admin-panel" ? "text-primary border-b-2 border-primary" : "text-black dark:text-primary"
                      )}
                    >
                      Admin
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}

                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-9 gap-1 hover:bg-primary/10 text-black dark:text-primary hover:text-primary">
                        About Us <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-card" align="end" sideOffset={8}>
                      <DropdownMenuGroup>
                        {aboutMenuItems.map((item) => (
                          <DropdownMenuItem
                            key={item.title}
                            className={cn(
                              "cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary",
                              pathname === item.href && "text-primary"
                            )}
                          >
                            {item.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              {searchVisible ? (
                <div className="flex items-center glass-card rounded-full pr-2">
                  <Input
                    className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    type="search"
                    placeholder="Search..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    autoFocus
                    onBlur={() => !searchValue && setSearchVisible(false)}
                  />
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
              ) : (
                <Button size="icon" variant="ghost" onClick={() => setSearchVisible(true)} className="hover:bg-primary/10 text-black/80 dark:text-primary hover:text-primary">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </Button>
              )}
            </div>

            <ConnectButton
              client={client}
              chain={activeChain}
              wallets={[
                inAppWallet({ auth: { options: ["google", "discord", "telegram", "email", "phone"] } }),
                createWallet("io.metamask"),
                createWallet("com.coinbase.wallet"),
                createWallet("me.rainbow"),
                createWallet("io.rabby"),
                createWallet("com.trustwallet.app"),
              ]}
              connectModal={{
                size: "wide",
                title: "Connect to Esusu",
                welcomeScreen: {
                  title: "Welcome to Esusu",
                  subtitle: "Connect your wallet or create a new one to get started",
                },
              }}
            />

            {/* Bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Open receipts" className="hover:bg-primary/10 hover:text-primary relative text-black/80 dark:text-primary">
                  <BellAlertIcon className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[360px] p-0">
                <ReceiptsMini />
              </PopoverContent>
            </Popover>

            {/* Mobile menu */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-black/80 dark:text-primary hover:bg-primary/10">
                    <Bars3Icon className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-[85%] max-w-sm p-0 flex flex-col bg-white dark:bg-neutral-950 border-l border-gray-100 dark:border-neutral-800">

                  {/* Sheet header with logo */}
                  <div className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-gray-100 dark:border-neutral-800">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Image src="/esusu.png" width={24} height={24} alt="Esusu" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Esusu</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">Decentralised finance for all</p>
                    </div>
                  </div>

                  {/* Main nav */}
                  <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    <Link
                      href="/"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                        pathname === "/"
                          ? "bg-primary/10 text-primary"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        pathname === "/" ? "bg-primary/15" : "bg-gray-100 dark:bg-neutral-800 group-hover:bg-gray-200 dark:group-hover:bg-neutral-700"
                      )}>
                        <HomeIcon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Home</span>
                      {pathname === "/" && <ChevronRightIcon className="h-3.5 w-3.5 ml-auto opacity-60" />}
                    </Link>

                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      const active = pathname === link.href;
                      return (
                        <Link
                          key={link.title}
                          href={link.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            active
                              ? "bg-primary/15"
                              : "bg-gray-100 dark:bg-neutral-800 group-hover:bg-gray-200 dark:group-hover:bg-neutral-700"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">{link.title}</span>
                          {link.href === "/betaFeatures" && (
                            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              Beta
                            </span>
                          )}
                          {active && link.href !== "/betaFeatures" && (
                            <ChevronRightIcon className="h-3.5 w-3.5 ml-auto opacity-60" />
                          )}
                        </Link>
                      );
                    })}

                    {/* Admin link */}
                    {!checkingAdmin && isAdmin && walletAddress && (
                      <Link
                        href="/admin-panel"
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                          pathname === "/admin-panel"
                            ? "bg-primary/10 text-primary"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                          <ShieldIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Admin Panel</span>
                      </Link>
                    )}

                    {/* Divider + About section */}
                    <div className="pt-3 pb-1">
                      <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                        About Us
                      </p>
                    </div>

                    {aboutMenuItems.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            active
                              ? "bg-primary/15"
                              : "bg-gray-100 dark:bg-neutral-800 group-hover:bg-gray-200 dark:group-hover:bg-neutral-700"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Footer strip */}
                  <div className="px-5 py-4 border-t border-gray-100 dark:border-neutral-800">
                    <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center">
                      © {new Date().getFullYear()} Esusu · All rights reserved
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}