import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bastion — Unofficial Realtime UAE Defence Dashboard",
  description:
    "Real-time statistics on Iranian attacks on the UAE — missiles, drones, interceptions.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/android-chrome-512x512.png" },
    ],
  },
  openGraph: {
    title: "Bastion — Unofficial Realtime UAE Defence Dashboard",
    description:
      "Real-time statistics on Iranian attacks on the UAE — missiles, drones, interceptions.",
    images: [{ url: "/Bastion Header.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bastion — Unofficial Realtime UAE Defence Dashboard",
    description:
      "Real-time statistics on Iranian attacks on the UAE — missiles, drones, interceptions.",
    images: ["/Bastion Header.png"],
  },
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
        <Analytics />
      </body>
    </html>
  );
}
