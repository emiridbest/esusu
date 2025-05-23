"use client";
import { useState, useEffect, useRef, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import {
  MagnifyingGlassIcon,
  BellAlertIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { cn } from "../lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from "../components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import { farcasterFrame as frameConnector } from '@farcaster/frame-wagmi-connector'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();


  const { isConnected, address } = useAccount()
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();


  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Navigation links
  const navLinks = [
    { title: "Pay Bills", href: "/" },

  ];

  // About menu items
  const aboutMenuItems = [
    { title: "Contact Us", href: "/contact" },
  ];

  // Function to format address for display
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected) {
    return (
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-black/80 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                className="cursor-pointer transition-all duration-300 hover:scale-105"
                src="/esusu.png"
                width="120"
                height="120"
                alt="EsusuLogo"
                onClick={() => router.push('/')}
              />
            </div>

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

                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-9 gap-1 hover:bg-primary/10 text-black hover:text-primary"
                        >
                          About Us
                          <ChevronDownIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-56 glass-card"
                        align="end"
                        sideOffset={8}
                      >
                        <DropdownMenuGroup>
                          {aboutMenuItems.map((item) => (
                            <DropdownMenuItem
                              key={item.title}
                              className={cn(
                                "cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary",
                                pathname === item.href && "text-primary border-b-2 border-primary"
                              )}
                            >
                              <Link href={item.href}>{item.title}</Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Connected User Section */}
            <div className="flex items-center space-x-4">
              {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="rounded-full px-4 border-gray-200 hover:border-primary/80 flex items-center gap-2 bg-white dark:bg-gray-800 shadow-sm"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-white text-xs">
                    {address ? address.substring(2, 4).toUpperCase() : ''}
                  </span>
                  </div>
                  <span className="font-medium text-sm">{formatAddress(address as string)}</span>
                  <ChevronDownIcon className="h-4 w-4 opacity-70" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-card" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                  className="cursor-pointer flex items-center justify-between hover:bg-primary/10 hover:text-primary"
                  onClick={() => disconnect()}
                  >
                  <span>Disconnect</span>
                  <XMarkIcon className="h-4 w-4" />
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              ) : (
              <Button 
                onClick={() => connect({ connector: frameConnector() })}
                className="rounded-full bg-primary hover:bg-primary/90   font-medium shadow-md"
              >
                Connect Wallet
              </Button>
              )}
              
              {/* Mobile menu */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-black/80 dark:text-primary hover:bg-primary/10">
                      <Bars3Icon className="color-black/50 h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="glass-card w-[80%]">
                    <div className="flex flex-col space-y-4 mt-8 dark:text-gray-500">
                      {/* Connected Status for Mobile */}
                      <div className="flex items-center space-x-3 py-3 px-4 mb-2 bg-primary/10 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
                          <span className="text-white">
                            {address ? address.substring(2, 4).toUpperCase() : ''}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Connected Wallet
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatAddress(address as string)}
                          </p>
                        </div>
                      </div>

                      <Link
                        href="/"
                        className={cn(
                          "py-2 px-4 rounded-lg transition-all duration-300",
                          pathname === "/"
                            ? "bg-primary/10 text-primary border-l-2 border-primary"
                            : "hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        Home
                      </Link>

                      {/* Rest of mobile menu remains the same */}
                      {navLinks.map((link) => (
                        <Link
                          key={link.title}
                          href={link.href}
                          className={cn(
                            "py-2 px-4 rounded-lg transition-all duration-300",
                            pathname === link.href
                              ? "bg-primary/10 text-primary border-l-2 border-primary"
                              : "hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          {link.title}
                        </Link>
                      ))}

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                          About Us
                        </h3>
                        <div className="mt-2 pl-4">
                          {aboutMenuItems.map((item) => (
                            <Link
                              key={item.title}
                              href={item.href}
                              className="py-2 px-4 block hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300"
                            >
                              {item.title}
                            </Link>
                          ))}
                        </div>
                      </div>
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

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-black/80 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              className="cursor-pointer transition-all duration-300 hover:scale-105"
              src="/esusu.png"
              width="120"
              height="120"
              alt="EsusuLogo"
              onClick={() => router.push('/')}
            />
          </div>

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

                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-9 gap-1 hover:bg-primary/10 text-black hover:text-primary"
                      >
                        About Us
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 glass-card"
                      align="end"
                      sideOffset={8}
                    >
                      <DropdownMenuGroup>
                        {aboutMenuItems.map((item) => (
                          <DropdownMenuItem
                            key={item.title}
                            className={cn(
                              "cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary",
                              pathname === item.href && "text-primary border-b-2 border-primary"
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
          <button
            type="button"
            className="hidden md:flex items-center justify-center h-10 w-10 text-black dark:text-white transition-all duration-300"
            onClick={() => connect({ connector: frameConnector() })}          >
            Connect
          </button>

        </div>
      </div>
    </header>
  );
}

declare global {
  interface Window {
    ethereum: any;
  }
}