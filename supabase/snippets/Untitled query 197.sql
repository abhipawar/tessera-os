CREATE OR REPLACE FUNCTION protect_role_column() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: You cannot modify your own role.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_role_protection
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_role_column();