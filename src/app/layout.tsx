import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ORIENT NET ISP",
  description: "Internet Fiber Optik në Shqipëri",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
