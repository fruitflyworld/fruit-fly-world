import type { Metadata } from "next";
import LaunchFilm from "./LaunchFilm";
import "./launch-film.css";

export const metadata: Metadata = {
  title: "Fruit Fly World — Launch Film",
  robots: { index: false, follow: false }
};

export default function LaunchFilmPage() {
  return <LaunchFilm />;
}
