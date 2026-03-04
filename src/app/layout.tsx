import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bastion — Unofficial Realtime UAE Defence Dashboard",
  description:
    "Real-time statistics on Iranian attacks on the UAE — missiles, drones, interceptions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
        {children}
      </body>
    </html>
  );
}
