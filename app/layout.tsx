// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import MeshProviderWrapper from "../components/MeshProviderWrapper";
import FeedbackWidget from "../components/FeedbackWidget";

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
      <body>
        {/* Use the client component wrapper here */}
        <MeshProviderWrapper>{children}</MeshProviderWrapper>
        <FeedbackWidget />
      </body>
    </html>
  );
}