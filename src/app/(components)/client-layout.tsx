"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar } from "./sidebar";
import { PageHeader } from "./page-header";
import { navItems } from "@/config/nav-items";
import { useParams } from "next/navigation";

// Tạo Context để chia sẻ trạng thái collapsed
const DashboardContext = createContext<{
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}>({
  collapsed: false,
  setCollapsed: () => {},
});

export const useDashboardContext = () => useContext(DashboardContext);

export default function ClientDashboardLayout({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false); // M c  nh sidebar m  (collapsed: false)
  // Inside your parent component
  const params = useParams();
  const junctionId = params?.junctionId as string;
  useEffect(() => {
    const handleResize = () =>
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <DashboardContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="flex h-screen bg-white dark:bg-gray-800">
        <Sidebar
          user={user}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          junctionId={junctionId}
        />
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            collapsed ? "ml-16" : "ml-64"
          } h-screen`}
        >
          <div className="flex flex-col h-screen">
            <PageHeader navItems={navItems} />
            <div className="h-[94vh]">{children}</div>
          </div>
        </main>
      </div>
    </DashboardContext.Provider>
  );
}
