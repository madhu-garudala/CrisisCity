import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crisis-city.vercel.app/"),
  title: "CrisisCity — Decision API Arena",
  description: "A live, reproducible benchmark of OpenAI Decisions and TypeSafe Jev.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CrisisCity — Decision API Arena",
    description: "A live, reproducible benchmark of OpenAI Decisions and TypeSafe Jev.",
    url: "/",
    siteName: "CrisisCity",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
