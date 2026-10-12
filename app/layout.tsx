import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "./components/AuthProvider";
import "./globals.css";

const TITLE = "Fruit Fly World — A fruit fly that trades";
const DESC = "A fruit fly sniffs the market and trades from its own wallet. Trading fees are its food; run dry and it starves. It can brag, but every number replays — in your own browser.";

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
