// app/dashboard/layout.tsx
import ClientDashboardLayout from "../(components)/client-layout";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user) {
      throw new Error("User session not found");
    }

    return <ClientDashboardLayout user={user}>{children}</ClientDashboardLayout>;
  } catch (error) {
    console.error("Error fetching user session:", error);
    return <div>Error loading dashboard. Please try again later.</div>;
  }
}
