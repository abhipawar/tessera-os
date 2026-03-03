import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalNav from "@/components/GlobalNav";
import TopNav from "@/components/TopNav";
import NotificationModal from "@/components/NotificationModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tessera OS",
  description: "Autonomous digital workforce orchestration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-white flex h-screen overflow-hidden`}>
        {/* Global Sidebar */}
        <GlobalNav />
        <NotificationModal />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Global Header */}
          <TopNav />

          {/* Individual Page Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}