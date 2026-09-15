import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "./components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fruit Fly World — One Map an Hour, Scored by a Pure Function",
  description: "A 6×4 map, four signals, six steps. Entrants submit a route; the server recomputes the score with a public pure function. Every hour, one winner.",
  metadataBase: new URL("https://fruitfly.world"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Fruit Fly World — One Map an Hour, Scored by a Pure Function",
    description: "Same round, same map, same seeds for everyone. Submit a route; the server recomputes the score with the function you can read. Every hour, one winner.",
    url: "https://fruitfly.world",
    siteName: "Fruit Fly World",
    images: [{ url: "/passport-genesis.png", width: 1200, height: 1200, alt: "Fruit Fly World Genesis Passport" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Fruit Fly World — One Map an Hour, Scored by a Pure Function",
    description: "Build a route by hand or hand the search to an agent. Same round, same map, same seeds — and a score you can recompute yourself.",
    images: ["/passport-genesis.png"]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      {/* Applied before first paint so a reader who chose Chinese never sees English flash.
          Language is a CSS switch on this attribute — no text is ever rendered by JS. */}
      <script dangerouslySetInnerHTML={{ __html: 'try{if(localStorage.getItem("ffw-lang")==="zh")document.documentElement.dataset.lang="zh"}catch(e){}' }} />
    </head>
    <body><AuthProvider>{children}</AuthProvider></body>
  </html>;
}
