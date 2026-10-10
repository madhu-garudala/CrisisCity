import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrisisCity — Decision API Arena",
  description: "A live, reproducible benchmark of OpenAI Decisions and TypeSafe Jev.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
