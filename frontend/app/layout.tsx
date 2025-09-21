import { ReactNode } from "react";
import { AppProvider } from "@/app/providers";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import FloatingChat from "@/components/FloatingChat";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
// Import Google Fonts
import { Inter, Poppins, Roboto, Dancing_Script, Caveat, Kalam } from 'next/font/google'

// Configure the fonts
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})

// Italic/Stylized fonts
const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-dancing',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-caveat',
  display: 'swap',
})

const kalam = Kalam({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-kalam',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable} ${roboto.variable} ${dancingScript.variable} ${caveat.variable} ${kalam.variable} font-sans italic`}>
        <ThemeProvider>
          <AppProvider>
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
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}