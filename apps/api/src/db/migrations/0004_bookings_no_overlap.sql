-- A barber can't have two live bookings whose time ranges overlap.
--
-- The database enforces it, not the application: if two requests try to take the same slot at the
-- same instant, both may pass the availability check, but only one INSERT succeeds; the other fails
-- with 23P01 (exclusion_violation), which the API turns into 409 SLOT_TAKEN.
--
-- * btree_gist (migration 0000) lets the GiST index combine "=" on staff_id with "&&" on the range.
-- * The range is half-open [start, blocks_until): a booking ending at 10:30 doesn't clash with one at 10:30.
-- * blocks_until includes the cleanup buffer, so the next client can't be booked inside it.
-- * Only live bookings count: cancelled, expired, completed or no-show ones free the slot.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "staff_id" WITH =,
    tstzrange("starts_at", "blocks_until", '[)') WITH &&
  ) WHERE ("status" IN ('pending_payment', 'confirmed'));
