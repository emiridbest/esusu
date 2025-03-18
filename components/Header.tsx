import { useState, useEffect, useRef, useContext } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { useConnect } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { 
  MagnifyingGlassIcon, 
  BellAlertIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon 
} from "@heroicons/react/24/outline";
import { ThemeContext } from "./Layout";
import { cn } from "@/lib/utils";
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { darkMode } = useContext(ThemeContext);

  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });

  useEffect(() => {
    connect();
  }, []);

  const handleSearchIconClick = () => {
    setSearchVisible(true);
  };

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
    { title: "Simple Saver", href: "/miniSafe" },
    { title: "Thrift", href: "/thrift" },
    { title: "Pay Bills", href: "/utilityBills" },
  ];

  // About menu items
  const aboutMenuItems = [
    { title: "FAQ", href: "/faq" },
    { title: "Testimonials", href: "/testimonials" },
    { title: "Contact", href: "/contact" },
    { title: "Invest", href: "/invest" },
    { title: "Jobs", href: "/jobs" },
    { title: "Blog", href: "/blogs" },
  ];

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
                    <Link href={link.href} legacyBehavior passHref>
                      <NavigationMenuLink 
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "bg-transparent hover:bg-primary/10 hover:text-primary transition-all duration-300",
                          router.pathname === link.href && "text-primary border-b-2 border-primary"
                        )}
                      >
                        {link.title}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                ))}

                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-9 gap-1 hover:bg-primary/10 hover:text-primary"
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
                            className="cursor-pointer hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                            onClick={() => router.push(item.href)}
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

          {/* Search & Notification */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              {searchVisible ? (
                <div className="flex items-center glass-card rounded-full pr-2">
                  <Input
                    className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    type="search"
                    placeholder="Search for orders here"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-gray-500 hover:text-primary hover:bg-transparent"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={handleSearchIconClick}
                  className="hover:bg-primary/10 hover:text-primary"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </Button>
              )}
            </div>

            <Button 
              size="icon" 
              variant="ghost"
              className="hover:bg-primary/10 hover:text-primary relative"
            >
              <BellAlertIcon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
            </Button>

            {/* Mobile menu */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="hover:bg-primary/10">
                    <Bars3Icon className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="glass-card w-[80%]">
                  <div className="flex flex-col space-y-4 mt-8">
                    <Link 
                      href="/" 
                      className={cn(
                        "py-2 px-4 rounded-lg transition-all duration-300",
                        router.pathname === "/" 
                          ? "bg-primary/10 text-primary border-l-2 border-primary" 
                          : "hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      Home
                    </Link>
                    
                    {navLinks.map((link) => (
                      <Link 
                        key={link.title}
                        href={link.href} 
                        className={cn(
                          "py-2 px-4 rounded-lg transition-all duration-300",
                          router.pathname === link.href 
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

declare global {
  interface Window {
    ethereum: any;
  }
}