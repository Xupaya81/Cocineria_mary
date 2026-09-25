CREATE TABLE customers (id TEXT PRIMARY KEY,business_id TEXT NOT NULL REFERENCES businesses(id),email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE customer_sessions (token_hash TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
ALTER TABLE reservations ADD COLUMN account_id TEXT;
CREATE INDEX reservations_account ON reservations(business_id,account_id,start_at);
CREATE TRIGGER customer_email_guard BEFORE INSERT ON customers BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM users WHERE email=NEW.email) THEN RAISE(ABORT,'account_email_unavailable') END;
END;
CREATE TRIGGER user_email_guard BEFORE INSERT ON users BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM customers WHERE email=NEW.email) THEN RAISE(ABORT,'account_email_unavailable') END;
END;
