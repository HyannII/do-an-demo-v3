"use client";

import { PageHeader } from "@/app/(components)/page-header";
import { navItems } from "@/config/nav-items";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./mapComponent"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="w-full">
      <MapComponent />
    </div>
  );
}
