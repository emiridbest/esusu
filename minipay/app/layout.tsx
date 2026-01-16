import { Providers } from "../app/providers";
import { getSession } from "../lib/auth";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { ThemeProvider } from "../components/ThemeProvider";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { Metadata } from "next";
import { Toaster } from "../components/ui/sonner";
import { ClaimProvider } from '../context/utilityProvider/ClaimContextProvider';


const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'https://farcaster.xyz/miniapps/ODGMy9CdO8UI/esusu'
export const metadata: Metadata = {
  title: 'Esusu - Buy Mobile Data Bundles',
  description: 'Top-up mobile data with crypto on the Celo blockchain',
  metadataBase: new URL(appUrl),
  openGraph: {
    images: ['/api/og/data'],
    title: 'Esusu - Mobile Data Bundles',
    description: 'Buy mobile data with crypto for Nigeria, Ghana, and more African countries',
    type: 'website',
  },
}
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <Providers session={session}>
            <ClaimProvider>
              <div className="min-h-screen bg-gradient-radial from-white via-gray-50 to-gray-100 dark:from-black dark:via-black dark:to-black">
                <Header />
                <main className="py-6 px-4 sm:px-6 lg:px-8">
                  <div className="max-w-7xl mx-auto">
                    {children}
                  </div>
                </main>
                <Toaster />
                <Footer />
              </div>
            </ClaimProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}