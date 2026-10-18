import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingPage from "@/components/LandingPage";
import { getAvailableSeasons } from "@/lib/data";
import { UserSession } from "./actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lionsweyhausen.vercel.app"),
  title: "Lions Weyhausen | SC Weyhausen Dartsport",
  description:
    "Offizielles Ranglisten- und Leistungsdiagnostik-Portal des SC Weyhausen von 1921 e.V. Sparte Dartsport",
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    canonical: "https://lionsweyhausen.vercel.app",
  },
  openGraph: {
    title: "Lions Weyhausen | SC Weyhausen Dartsport",
    description:
      "Offizielles Ranglisten- und Leistungsdiagnostik-Portal des SC Weyhausen von 1921 e.V. Sparte Dartsport",
    url: "https://lionsweyhausen.vercel.app",
    siteName: "Lions Weyhausen",
    locale: "de_DE",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("lions_session");
  let user: UserSession = {
    id: 3,
    name: "Sebastian Kirste",
    role: "admin",
    team: "A-Team",
  };

  if (sessionCookie?.value) {
    try {
      user = JSON.parse(sessionCookie.value) as UserSession;
    } catch (e) {
      // Fallback auf Sebastian Kirste
    }
  }

  const seasons = await getAvailableSeasons();

  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050811] text-slate-100">
        <div className="min-h-screen flex flex-col">
          <Suspense fallback={<div className="h-16 bg-slate-950/80" />}>
            <Header user={user} seasons={seasons} />
          </Suspense>
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
