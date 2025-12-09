import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Providers } from './providers';
import { viewport } from "./viewport";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "VEMBI Inventory QC",
  description: "Inventory and Quality Control Management System",
};

export { viewport };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="theme-color" content="#6D1A27" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.variable} font-sans h-full antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
