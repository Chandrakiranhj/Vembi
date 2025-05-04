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
      <html lang="en">
        <body className={inter.className}>
          <Providers>
          {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
