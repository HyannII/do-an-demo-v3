"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar } from "./sidebar";

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
        />
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            collapsed ? "ml-16" : "ml-64"
          } h-screen`}
        >
          <div className="h-full flex flex-col">{children}</div>
        </main>
      </div>
    </DashboardContext.Provider>
  );
}
