-- Create the otp_codes table for email verification
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for OTP verification (internal/service-role access)
-- Typically, the client doesn't need to read/write directly, but we can allow users to read their own for debugging
-- However, for security, usually it's better to keep it restricted and use a service role in the API.

-- Add indices for faster lookup
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON public.otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON public.otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
