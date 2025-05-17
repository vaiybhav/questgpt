import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from 'react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuestGPT - Your AI Adventure",
  description: "Embark on an AI-powered text adventure where your choices shape the story.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-ui-background text-ui-foreground`}>{children}</body>
    </html>
  );
} 