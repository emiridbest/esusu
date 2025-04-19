"use client";
import { ReactNode, useState, useEffect, createContext } from "react";
import { AppProvider } from "@/app/providers";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import FloatingChat from "@/components/FloatingChat";
import { Moon, Sun } from "lucide-react";
import "@/styles/globals.css";

export const ThemeContext = createContext({
  darkMode: false,
  toggleTheme: () => {},
});

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const [darkMode, setDarkMode] = useState(false);
  
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <html lang="en" className={darkMode ? 'dark' : ''}>
      <body>
        <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
          <AppProvider>
            <div className="min-h-screen bg-gradient-radial from-white via-gray-50 to-gray-100 dark:from-black dark:via-black dark:to-black">
              <Header />
              <button 
                onClick={toggleTheme}
                className="fixed right-4 top-20 z-50 p-2 rounded-full backdrop-blur-sm bg-white/30 dark:bg-black/30 border border-gray-200 dark:border-gray-800 shadow-lg hover:scale-110 transition-all"
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-yellow-400" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-700" />
                )}
              </button>
              <main className="py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
              <FloatingChat />
              <Footer />
            </div>
          </AppProvider>
        </ThemeContext.Provider>
      </body>
    </html>
  );
}