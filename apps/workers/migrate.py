import psycopg
import os

conn_string = "postgresql://postgres.zxbqdlpdgffshgdbuyxy:XDYIbIsvvFMQvIeQ@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require"

sql = """
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_verifications(email);
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
"""

try:
    with psycopg.connect(conn_string) as conn:
        with conn.cursor() as cur:
            print("Connected to Supabase. Executing OTP migration...")
            cur.execute(sql)
            conn.commit()
            print("Success! otp_verifications table created.")
except Exception as e:
    print(f"Error: {e}")
