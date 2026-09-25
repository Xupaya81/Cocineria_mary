PRAGMA foreign_keys = ON;
CREATE TABLE businesses (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL CHECK(json_valid(content)), version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE users (id TEXT PRIMARY KEY,business_id TEXT NOT NULL REFERENCES businesses(id),email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('superadmin','propietario','personal')));
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE dining_tables (id TEXT NOT NULL,business_id TEXT NOT NULL REFERENCES businesses(id),name TEXT NOT NULL,capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 50),people INTEGER NOT NULL DEFAULT 0 CHECK(people>=0 AND people<=capacity),status TEXT NOT NULL CHECK(status IN ('disponible','ocupada','reservada','fuera de servicio')),PRIMARY KEY(business_id,id));
CREATE TABLE reservations (id TEXT PRIMARY KEY,business_id TEXT NOT NULL REFERENCES businesses(id),table_id TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,start_at INTEGER NOT NULL,end_at INTEGER NOT NULL,people INTEGER NOT NULL CHECK(people>0),status TEXT NOT NULL CHECK(status IN ('pendiente','confirmada','cancelada','finalizada')),created_at INTEGER NOT NULL,FOREIGN KEY(business_id,table_id) REFERENCES dining_tables(business_id,id),CHECK(end_at>start_at));
CREATE INDEX reservations_availability ON reservations(business_id,table_id,start_at,end_at,status);
CREATE TRIGGER reservation_insert_guard BEFORE INSERT ON reservations WHEN NEW.status IN ('pendiente','confirmada') BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM dining_tables WHERE business_id=NEW.business_id AND id=NEW.table_id AND capacity>=NEW.people AND status!='fuera de servicio') THEN RAISE(ABORT,'table_capacity') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM reservations WHERE business_id=NEW.business_id AND table_id=NEW.table_id AND status IN ('pendiente','confirmada') AND start_at<NEW.end_at AND end_at>NEW.start_at) THEN RAISE(ABORT,'reservation_overlap') END;
END;
CREATE TRIGGER reservation_update_guard BEFORE UPDATE ON reservations WHEN NEW.status IN ('pendiente','confirmada') BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM dining_tables WHERE business_id=NEW.business_id AND id=NEW.table_id AND capacity>=NEW.people AND status!='fuera de servicio') THEN RAISE(ABORT,'table_capacity') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM reservations WHERE id!=NEW.id AND business_id=NEW.business_id AND table_id=NEW.table_id AND status IN ('pendiente','confirmada') AND start_at<NEW.end_at AND end_at>NEW.start_at) THEN RAISE(ABORT,'reservation_overlap') END;
END;
CREATE TRIGGER table_update_guard BEFORE UPDATE ON dining_tables BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM reservations WHERE business_id=NEW.business_id AND table_id=NEW.id AND status IN ('pendiente','confirmada') AND (people>NEW.capacity OR NEW.status='fuera de servicio')) THEN RAISE(ABORT,'table_has_reservations') END;
END;
CREATE TABLE feedback (id TEXT PRIMARY KEY,business_id TEXT NOT NULL REFERENCES businesses(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),comment TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE events (id TEXT PRIMARY KEY,business_id TEXT NOT NULL REFERENCES businesses(id),type TEXT NOT NULL,target TEXT NOT NULL,channel TEXT NOT NULL,session_hash TEXT NOT NULL,bucket INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(business_id,type,target,session_hash,bucket));
CREATE INDEX event_reports ON events(business_id,created_at,target);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE audit_log (id TEXT PRIMARY KEY,business_id TEXT NOT NULL,actor_id TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created_at INTEGER NOT NULL);
