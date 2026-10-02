import { redirect } from "next/navigation";
import { getMyBusinesses } from "@/lib/server-api";

export default async function PanelIndex() {
  const [first] = await getMyBusinesses();
  redirect(first ? `/panel/${first.id}` : "/onboarding");
}
