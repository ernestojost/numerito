-- btree_gist lets a GiST index combine equality (staff_id) with range overlap (tstzrange),
-- which the bookings exclusion constraint relies on to prevent double-booking.
CREATE EXTENSION IF NOT EXISTS btree_gist;
