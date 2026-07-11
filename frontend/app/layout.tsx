import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoom Clone",
  description: "A functional video conferencing web app inspired by Zoom.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans text-gray-900 antialiased">{children}</body>
    </html>
  );
}
