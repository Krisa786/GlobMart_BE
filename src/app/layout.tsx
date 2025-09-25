import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Global International - Elevate Hospitality Through Care & Consistency",
  description: "Premium hospitality products and services for the global hospitality industry. Eco-friendly, sustainable, and safety-assured solutions.",
  keywords: "hospitality, amenities, linen, safety, washroom, sustainability, eco-friendly",
  authors: [{ name: "Global International" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased" suppressHydrationWarning={true}>
        {/* Skip to content link for accessibility */}
        {/* <a 
          href="#main-content" 
          className="skip-to-content"
        >
          Skip to main content
        </a> */}
        
        {/* App Shell Structure */}
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
