// app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MeshProviderWrapper from "../components/MeshProviderWrapper"; // Import the new wrapper

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cardano Developer Suite",
  description: "The Smartest Way to Build on Cardano",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Use the client component wrapper here */}
        <MeshProviderWrapper>{children}</MeshProviderWrapper>
      </body>
    </html>
  );
}