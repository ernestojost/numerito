import type { Metadata } from "next";
import type { Service, Staff } from "@numerito/shared";
import { serverJson } from "@/lib/server-api";
import { StaffManager } from "./staff-manager";

export const metadata: Metadata = { title: "Barberos · Numerito" };

export default async function StaffPage({ params }: PageProps<"/panel/[businessId]/barberos">) {
  const { businessId } = await params;
  const [staff, services] = await Promise.all([
    serverJson<Staff[]>(`/businesses/${businessId}/staff`),
    serverJson<Service[]>(`/businesses/${businessId}/services`),
  ]);

  return <StaffManager businessId={businessId} staff={staff ?? []} services={services ?? []} />;
}
