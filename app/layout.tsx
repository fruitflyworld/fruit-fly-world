import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "./components/AuthProvider";
import "./globals.css";

const TITLE = "Fruit Fly World — A fruit fly that trades";
const DESC = "A fruit-fly circuit trades an invented paper market, live 24/7. No real money moves. Every decision is hashed, chained and replayable in your browser.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  metadataBase: new URL("https://fruitfly.world"),
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "https://fruitfly.world",
    siteName: "Fruit Fly World",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "It can brag. Every number replays."
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning>
    <head />
    <body><AuthProvider>{children}</AuthProvider></body>
  </html>;
}
