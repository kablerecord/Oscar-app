import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSQR - Your AI Operating System for Capability",
  description: "Stop asking AI questions. Start asking better ones. OSQR is the AI operating system that helps you think sharper, decide faster, and build capability that compounds.",
  keywords: ["AI", "productivity", "thinking", "decision making", "multi-model AI", "personal knowledge"],
  authors: [{ name: "Kable Record" }],
  openGraph: {
    title: "OSQR - Your AI Operating System for Capability",
    description: "Stop asking AI questions. Start asking better ones.",
    url: "https://osqr.app",
    siteName: "OSQR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OSQR - Your AI Operating System for Capability",
    description: "Stop asking AI questions. Start asking better ones.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-900`}
      >
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
