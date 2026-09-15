import { notFound } from "next/navigation";
import ReplayClient from "./ReplayClient";

export const dynamic = "force-dynamic";

export default async function ExperimentRecord({ params }: { params: { id: string } }) {
  return <ReplayClient id={params.id} />;
}

export function generateMetadata({ params }: { params: { id: string } }) {
  if (!params.id) notFound();
  return { title: `Experiment ${params.id} — Fruit Fly World`, description: "Replay a canonical Fruit Fly World experiment record." };
}
