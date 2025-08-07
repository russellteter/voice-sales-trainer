import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Sales Trainer",
  description: "AI-powered voice sales training platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
