import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import FloatingChat from "@/components/FloatingChat";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/styles/globals.css";
import "flag-icons/css/flag-icons.min.css";
import { Toaster } from "@/components/ui/sonner";
// Import Google Fonts


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="talentapp:project_verification" content="c66c108f066fb8413760754adedec90ca0ae569bd577be75d8baa9077736345e77526ed3a3779ff76e60c413a72ca87213cf702649eb29762202f11390b410ed" />
      </head>
      <body className="font-mono">
        <ThemeProvider>
          <Providers>
            <div className="min-h-screen bg-gradient-radial from-white via-gray-50 to-gray-100 dark:from-black dark:via-black dark:to-black">
              <Header />
              <main className="py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
              <Toaster />
              <FloatingChat />
              <Footer />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}