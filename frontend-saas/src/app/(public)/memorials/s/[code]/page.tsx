import { notFound } from "next/navigation";
import { resolveMemorialCode } from "@/lib/memorialMetadata";
import ShortMemorialClient from "./ShortMemorialClient";

export default async function ShortMemorialPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const uuid = await resolveMemorialCode(code);
  if (!uuid) notFound();
  return <ShortMemorialClient uuid={uuid} />;
}
