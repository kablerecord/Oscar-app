import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PanelBrain - Multi-Model AI Master Brain",
  description: "Your personal multi-model AI panel discussion and knowledge base",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
