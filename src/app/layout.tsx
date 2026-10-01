import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vunds",
  description: "Household finance dashboard for Ivan and Vero",
  applicationName: "Vunds",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vunds",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf6f0",
  width: "device-width",
  initialScale: 1,
  // Deliberately NO maximumScale — users must be able to pinch-zoom
  // (WCAG 1.4.4). iOS Safari's auto-zoom on focused inputs is avoided by
  // keeping input font-size ≥ 16px (see FormField inputClass).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
