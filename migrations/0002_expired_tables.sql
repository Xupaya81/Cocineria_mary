DROP TRIGGER table_update_guard;
CREATE TRIGGER table_update_guard BEFORE UPDATE ON dining_tables BEGIN
 SELECT RAISE(ABORT,'table_has_reservations')
 WHERE EXISTS(SELECT 1 FROM reservations WHERE business_id=NEW.business_id AND table_id=NEW.id AND status IN ('pendiente','confirmada') AND end_at>unixepoch()*1000 AND (people>NEW.capacity OR NEW.status='fuera de servicio'));
END;
