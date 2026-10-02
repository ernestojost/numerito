/**
 * Demo data: "Barbería Don Julio" at /b/don-julio, with an owner account to log into the panel.
 * Safe to run twice: if the business exists it does nothing (pass --reset to recreate it).
 */
import { eq } from "drizzle-orm";
import { auth } from "../auth/index.js";
import { computeAvailability, localDate } from "../modules/availability/service.js";
import { bookingsService } from "../modules/bookings/service.js";
import { businessService } from "../modules/businesses/service.js";
import { schedulesService } from "../modules/schedules/service.js";
import { servicesService } from "../modules/services/service.js";
import { staffService } from "../modules/staff/service.js";
import { db, sql } from "./client.js";
import { organization, user } from "./schema/index.js";

export const DEMO = {
  slug: "don-julio",
  name: "Barbería Don Julio",
  owner: { name: "Julio (demo)", email: "demo@numerito.app", password: "demo-numerito" },
};

const reset = process.argv.includes("--reset");

const existing = await db.select({ id: organization.id }).from(organization).where(eq(organization.slug, DEMO.slug));
if (existing.length > 0 && !reset) {
  console.log(`"${DEMO.name}" ya existe. Usa --reset para recrearla.`);
  await sql.end();
  process.exit(0);
}
if (reset) {
  await db.delete(organization).where(eq(organization.slug, DEMO.slug));
  await db.delete(user).where(eq(user.email, DEMO.owner.email));
}

const { user: owner } = await auth.api.signUpEmail({ body: DEMO.owner });
const business = await businessService(db).create(owner.id, {
  name: DEMO.name,
  slug: DEMO.slug,
  timezone: "America/Argentina/Buenos_Aires",
  category: "barberia",
});

const services = servicesService(db);
const corte = await services.create(business.id, {
  name: "Corte",
  durationMinutes: 30,
  bufferMinutes: 10,
  priceCents: 600000,
  depositCents: null,
  active: true,
});
const corteBarba = await services.create(business.id, {
  name: "Corte + barba",
  durationMinutes: 45,
  bufferMinutes: 10,
  priceCents: 900000,
  depositCents: null,
  active: true,
});
const perfilado = await services.create(business.id, {
  name: "Perfilado de barba",
  durationMinutes: 20,
  bufferMinutes: 5,
  priceCents: 400000,
  depositCents: 200000,
  active: true,
});

const staff = staffService(db);
const all = [corte.id, corteBarba.id, perfilado.id];
const { id: julioId } = await staff.create(business.id, { displayName: "Julio", email: null, active: true, serviceIds: all });
const marcos = await staff.create(business.id, { displayName: "Marcos", email: null, active: true, serviceIds: all });
const marcosId = marcos.id;
const sofi = await staff.create(business.id, { displayName: "Sofi", email: null, active: true, serviceIds: [corte.id] });

const schedules = schedulesService(db);
const weekdays = [1, 2, 3, 4, 5];
await schedules.setBusinessHours(business.id, [
  ...weekdays.flatMap((weekday) => [
    { weekday, start: "09:00", end: "13:00" },
    { weekday, start: "16:00", end: "20:00" },
  ]),
  { weekday: 6, start: "09:00", end: "14:00" },
]);
await schedules.setStaffSchedule(business.id, marcos.id, [
  ...weekdays.flatMap((weekday) => [
    { weekday, start: "09:00", end: "13:00" },
    { weekday, start: "15:00", end: "20:00" },
  ]),
]);
await schedules.setStaffSchedule(business.id, sofi.id, [
  ...[1, 2, 3, 4, 5, 6].flatMap((weekday) => [
    { weekday, start: "10:00", end: "14:00" },
    { weekday, start: "15:00", end: "19:00" },
  ]),
]);

// Example bookings for today and tomorrow, so the demo agenda isn't empty.
const bookingsApi = bookingsService(db);
const clients = ["Nico", "Dani", "Leo", "Fede", "Caro", "Juli"];
let made = 0;
for (const offset of [0, 1]) {
  const date = localDate(new Date(Date.now() + offset * 86_400_000), "America/Argentina/Buenos_Aires");
  for (const [index, member] of [marcosId, julioId, sofi.id].entries()) {
    const service = member === sofi.id ? corte : [corteBarba, corte, perfilado][index % 3]!;
    const { slots } = await computeAvailability(db, { businessId: business.id, serviceId: service.id, date, staffId: member, ignoreLeadTime: true });
    // Two or three bookings per barber, spread over the day.
    for (const slot of [slots[1], slots[Math.floor(slots.length / 2)], slots.at(-3)].filter(Boolean)) {
      try {
        await bookingsApi.createManual(business.id, owner.id, {
          serviceId: service.id,
          staffId: member,
          startsAt: slot!.startsAt,
          customer: { name: clients[made % clients.length]!, phone: null },
          notes: "Turno de ejemplo",
        });
        made++;
      } catch {
        // Overlaps with one created a moment ago: skip it.
      }
    }
  }
}

console.log(`Listo: ${DEMO.name} en /b/${DEMO.slug} (${made} turnos de ejemplo)`);
console.log(`Panel: ${DEMO.owner.email} / ${DEMO.owner.password}`);
await sql.end();
