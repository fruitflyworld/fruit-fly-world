import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "./components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fruit Fly World — A Playable Lineage of Small Decisions",
  description: "A single-player fruit-fly lineage game: forage under pressure, read a predator's committed strike, escape with the Giant Fiber reflex, and carry the lineage forward. The research layer around it explains the connectome-inspired model.",
  metadataBase: new URL("https://fruitfly.world"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Fruit Fly World — A Playable Lineage of Small Decisions",
    description: "Forage, escape, and carry the lineage forward. A single-player game built on a simplified, connectome-inspired escape circuit — with an inspectable world around it.",
    url: "https://fruitfly.world",
    siteName: "Fruit Fly World",
    images: [{ url: "/launch-film-poster.jpg", width: 1200, height: 675, alt: "Fruit Fly World playable lineage game world" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Fruit Fly World — A Playable Lineage of Small Decisions",
    description: "Forage under pressure, read the predator's committed lunge, escape when the GF reflex is ready. Playable in the browser, scored by a model you can inspect.",
    images: ["/launch-film-poster.jpg"]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning>
    <head />
    <body><AuthProvider>{children}</AuthProvider></body>
  </html>;
}
