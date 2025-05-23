import { Providers } from "../app/providers";
import { getSession } from "../lib/auth";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { ThemeProvider } from "../components/ThemeProvider";
import SplashScreen from "../components/SplashScreen";
import "./globals.css";
import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_URL
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
  // Add Farcaster frame meta tag for mini app embedding
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: `${appUrl}/api/og/data`,
      button: {
        title: "📱 Buy Data",
        action: {
          type: "launch_frame",
          name: "Esusu",
          url: appUrl,
          splashImageUrl: `${appUrl}/esusu.png`,
          splashBackgroundColor: "#f5f0ec",
          webhookUrl: `${appUrl}/api/farcaster/webhook`,
        }
      }
    })
  }
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
            <SplashScreen />
            <div className="min-h-screen bg-gradient-radial from-white via-gray-50 to-gray-100 dark:from-black dark:via-black dark:to-black">
              <Header />
              <main className="py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
              <Footer />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}