import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#071b36",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "VMC Platform | Valhalla Motorcycles",
    template: "%s | VMC Platform",
  },
  description: "Secure operations platform for Valhalla Motorcycles.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VMC Platform",
  },
  icons: {
    apple: "/vmc-logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
