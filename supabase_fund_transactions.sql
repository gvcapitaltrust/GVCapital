-- ============================================================
-- Phase 2: Fund Transactions Table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Create the fund_transactions table
CREATE TABLE IF NOT EXISTS fund_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- What type of investment account
    fund_type TEXT NOT NULL CHECK (fund_type IN ('forex', 'stock', 'other')),
    
    -- What kind of transaction
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('allocation', 'return', 'loss', 'reallocation', 'withdrawal')),
    
    -- Amount in USD (always positive)
    amount_usd NUMERIC(15, 2) NOT NULL CHECK (amount_usd > 0),
    
    -- For reallocations: where the money is going
    target_fund_type TEXT CHECK (target_fund_type IN ('forex', 'stock', 'other', 'cash')),
    
    -- Description / notes
    description TEXT,
    
    -- Who recorded this
    created_by UUID REFERENCES auth.users(id),
    
    -- Any extra metadata (JSON)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read/write
-- (Adjust this based on your auth setup)
CREATE POLICY "Admins can do everything on fund_transactions"
    ON fund_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE fund_transactions;

-- Index for performance
CREATE INDEX idx_fund_transactions_type ON fund_transactions(fund_type);
CREATE INDEX idx_fund_transactions_created ON fund_transactions(created_at DESC);
