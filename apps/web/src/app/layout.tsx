import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. Import the new navigation rail
import GlobalNav from "@/components/GlobalNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tessera OS | Enterprise AI",
  description: "Autonomous digital workforce orchestration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 2. Set the body to a row-based flex container */}
      <body className={`${inter.className} flex h-screen w-screen overflow-hidden bg-slate-50`}>
        {/* 3. The Nav Rail sits on the left */}
        <GlobalNav />
        
        {/* 4. The main content area takes up the rest of the screen */}
        <main className="flex-1 h-screen overflow-y-auto relative">
          {children}
        </main>
      </body>
    </html>
  );
}