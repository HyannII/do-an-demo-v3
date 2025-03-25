"use client";

import { PageHeader } from "@/app/(components)/page-header";
import { navItems } from "@/config/nav-items";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./mapComponent"), {
  ssr: false,
});

export default function Home() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <PageHeader navItems={navItems} />
      <MapComponent />
    </div>
  );
}
