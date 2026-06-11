import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIRA — AI Reach Agent",
  description:
    "AI-native mini CRM that turns plain-language campaign goals into live audience campaigns.",
  keywords: ["CRM", "AI", "campaigns", "marketing automation"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-canvas text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
