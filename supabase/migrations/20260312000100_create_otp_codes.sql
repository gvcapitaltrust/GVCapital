-- Migration to create otp_codes table for withdrawal verification
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Note: Policies are typically not needed for the frontend as we use the service role key in the API route.
-- However, we can add a basic policy if needed for the user to read their own (though not recommended for security).

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON public.otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON public.otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
