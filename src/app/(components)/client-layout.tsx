// src/components/dashboard/client-layout.tsx
"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { navItems } from "@/config/nav-items";

export default function ClientDashboardLayout({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Add useEffect to set CSS variable for viewport height
  useEffect(() => {
    // Set the vh CSS variable based on window height
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    // Set initial value
    setVh();

    // Update on resize
    window.addEventListener("resize", setVh);

    // Clean up
    return () => window.removeEventListener("resize", setVh);
  }, []);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-800 ">
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
  );
}
