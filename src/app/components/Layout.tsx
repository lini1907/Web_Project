import React from "react";
import { Outlet } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./TrustStripAndFooter";

export function Layout() {
  return (
    <div className="min-h-screen bg-[#F0FDF4] text-[#1F2937] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}