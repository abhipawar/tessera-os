import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalNav from "@/components/GlobalNav";
import TopNav from "@/components/TopNav";
import NotificationModal from "@/components/NotificationModal";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tessera OS",
  description: "Autonomous digital workforce orchestration.",
};

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Resolve roles upfront on the server
  let rootRole = null;
  let isSuperAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_tessera_admin')
      .eq('id', user.id)
      .single();

    isSuperAdmin = profile?.is_tessera_admin || false;

    if (isSuperAdmin) {
      rootRole = "Super Admin";
    } else {
      const { data: tenantMember } = await supabase
        .from('tenant_members')
        .select('tenant_role')
        .eq('user_id', user.id)
        .single();

      if (tenantMember) {
        rootRole = `Tenant ${tenantMember.tenant_role.charAt(0).toUpperCase() + tenantMember.tenant_role.slice(1)}`;
      } else {
        rootRole = "User";
      }
    }
  }

  // Pass these initial pre-hydrated values down
  const initialUser = user ? { email: user.email } : null;
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-white flex h-screen overflow-hidden`}>
        {/* Global Sidebar */}
        <GlobalNav initialUser={initialUser} isSuperAdmin={isSuperAdmin} />
        <NotificationModal />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Global Header */}
          <TopNav initialUser={initialUser} rootRole={rootRole} />

          {/* Individual Page Content */}
          <main className="flex-1 overflow-auto flex flex-col relative w-full h-full">
            <div className="flex-1 w-full mx-auto">
              {children}
            </div>
            <Footer />
          </main>
        </div>
      </body>
    </html>
  );
}