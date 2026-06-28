'use client';

import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

import { ToastProvider } from "./context/ToastContext";
import { PermissionProvider } from "./context/PermissionContext";
import { TenantProvider } from "./context/TenantContext";
import { PlanLimitModal } from "@/components/tenant/PlanLimitModal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${outfit.variable} antialiased min-h-screen text-slate-100`}>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <ThemeProvider>
            <ToastProvider>
              <PermissionProvider>
                {children}
                <PlanLimitModal />
              </PermissionProvider>
            </ToastProvider>
          </ThemeProvider>
        </TenantProvider>
      </QueryClientProvider>
    </div>
  );
}

