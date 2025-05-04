import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from './providers';
import ClientAdminAIChatWrapper from "../components/ClientAdminAIChatWrapper";

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
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <Providers>
            {children}
            <ClientAdminAIChatWrapper />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
