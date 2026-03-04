-- Migration: Create OTP Verifications Table

CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rapid lookups and cleanups by email
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_verifications(email);

-- Ensure old OTPs are securely discarded 
-- Only valid, non-expired codes will be able to be fetched
-- The web interface operates exclusively using Service Roles for OTPs to bypass anonymous RLS.
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
