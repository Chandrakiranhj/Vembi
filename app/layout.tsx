import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from './providers';
import { ensureAIInitialized } from "@/lib/ai-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VEMBI Inventory QC",
  description: "Inventory and Quality Control Management System",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize AI services
  if (typeof window === 'undefined') {
    ensureAIInitialized();
  }

  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <head>
          <meta name="theme-color" content="#6D1A27" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="format-detection" content="telephone=no" />
        </head>
        <body className={`${inter.className} h-full`}>
          <Providers>
          {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
