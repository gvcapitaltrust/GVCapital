import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        // Support both JSON and Form Data (different gateways use different formats)
        let payload: any;
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            payload = await request.json();
        } else {
            const formData = await request.formData();
            payload = Object.fromEntries(formData.entries());
        }

        // ToyyibPay / Billplz style fields
        // Map common fields to our logic
        const status = payload.status || payload.state || payload.billpaymentStatus;
        const amount_myr = parseFloat(payload.amount || payload.billAmount || payload.paid_amount);
        const userId = payload.order_id || payload.billExternalReferenceNo || payload.msg;
        const refId = payload.refno || payload.billpaymentSettlementRefNo || payload.transaction_id;

        console.log('Payment Callback Received:', { status, amount_myr, userId, refId });

        if (status === 'Success' || status === '1' || status === 'paid') {
            if (!userId) {
                return NextResponse.json({ success: false, message: 'Missing User ID' }, { status: 400 });
            }

            // 1. Fetch the current usd_to_myr_rate from platform_settings
            const { data: forexData } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'usd_to_myr_rate')
                .single();

            const rate = parseFloat(forexData?.value || '4.0');

            // 2. Calculate amount_usd
            const amount_usd = amount_myr / rate;

            // 3. Update the user's balance_usd and balance (MYR) in the profiles table
            const { data: currentProfile, error: profileError } = await supabase
                .from('profiles')
                .select('balance, balance_usd')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            const updatedBalanceMYR = (Number(currentProfile?.balance) || 0) + amount_myr;
            const updatedBalanceUSD = (Number(currentProfile?.balance_usd) || 0) + amount_usd;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    balance: updatedBalanceMYR,
                    balance_usd: updatedBalanceUSD
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // 4. Save the transaction record with both the RM paid and the USD credited
            const { error: txError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: userId,
                    type: 'Deposit',
                    amount: amount_myr,
                    amount_usd: amount_usd,
                    status: 'Approved',
                    ref_id: refId || `PAY-${Date.now()}`,
                    description: `Automated Payment gateway deposit (RM ${amount_myr} -> $${amount_usd.toFixed(2)} USD)`
                }]);

            if (txError) throw txError;

            return NextResponse.json({ success: true, message: 'Payment processed and credited' });
        }

        return NextResponse.json({ success: false, message: 'Payment not successful' });

    } catch (err: any) {
        console.error('Callback Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// Support GET for some gateways that test the URL with a GET ping
export async function GET() {
    return NextResponse.json({ status: 'Callback endpoint active' });
}
