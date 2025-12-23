import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { FocusModeProvider } from "@/components/focus/FocusModeContext";
import { TipsHighlightProvider } from "@/components/tips/TipsHighlightProvider";

export const metadata: Metadata = {
  title: "OSQR - Your AI Operating System for Capability",
  description: "Think sharper, decide faster, and build capability that compounds with OSQR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-900 font-sans antialiased">
        {/* Animated background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -left-40 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="fixed inset-0 bg-grid-pattern pointer-events-none opacity-50" />

        <SessionProvider>
          <FocusModeProvider>
            <TipsHighlightProvider>
              <div className="relative">
                {children}
              </div>
            </TipsHighlightProvider>
          </FocusModeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
