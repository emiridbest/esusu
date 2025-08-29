import { ReactNode } from "react";
import { Providers } from "@/app/providers";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import FloatingChat from "@/components/FloatingChat";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>
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