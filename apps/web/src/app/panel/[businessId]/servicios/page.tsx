import type { Metadata } from "next";
import type { Service, Staff } from "@numerito/shared";
import { serverJson } from "@/lib/server-api";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Servicios · Numerito" };

export default async function ServicesPage({ params }: PageProps<"/panel/[businessId]/servicios">) {
  const { businessId } = await params;
  const [services, staff] = await Promise.all([
    serverJson<Service[]>(`/businesses/${businessId}/services`),
    serverJson<Staff[]>(`/businesses/${businessId}/staff`),
  ]);

  return <ServicesManager businessId={businessId} services={services ?? []} staff={staff ?? []} />;
}
