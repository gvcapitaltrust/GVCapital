import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabase } from '@/lib/supabaseClient';

function verifySignature(rawBody: string, headers: Headers, payload: any): boolean {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return false;

    // 1. Header HMAC: providers like Billplz send x-signature = HMAC-SHA256(raw body, secret)
    const headerSig = headers.get('x-signature') || headers.get('x-billplz-signature');
    if (headerSig) {
        const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
        try {
            const a = Buffer.from(headerSig, 'hex');
            const b = Buffer.from(expected, 'hex');
            if (a.length === b.length && timingSafeEqual(a, b)) return true;
        } catch {
            // fall through
        }
    }

    // 2. Inline secret: ToyyibPay-style includes the secret as a payload field
    const inlineSecret = payload?.userSecretKey || payload?.secret_key || payload?.webhook_secret;
    if (inlineSecret && typeof inlineSecret === 'string') {
        const a = Buffer.from(inlineSecret);
        const b = Buffer.from(secret);
        if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }

    return false;
}

export async function POST(request: Request) {
    try {
        if (!process.env.PAYMENT_WEBHOOK_SECRET) {
            console.error('Payment Callback: PAYMENT_WEBHOOK_SECRET is not configured.');
            return NextResponse.json(
                { success: false, message: 'Payment webhook not configured' },
                { status: 503 }
            );
        }

        const rawBody = await request.text();
        const contentType = request.headers.get('content-type') || '';

        let payload: any;
        if (contentType.includes('application/json')) {
            payload = rawBody ? JSON.parse(rawBody) : {};
        } else {
            payload = Object.fromEntries(new URLSearchParams(rawBody).entries());
        }

        if (!verifySignature(rawBody, request.headers, payload)) {
            console.warn('Payment Callback: Signature verification failed.');
            return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 401 });
        }

        // ToyyibPay / Billplz style fields
        const status = payload.status || payload.state || payload.billpaymentStatus;
        const amount_myr = parseFloat(payload.amount || payload.billAmount || payload.paid_amount);
        const userId = payload.order_id || payload.billExternalReferenceNo || payload.msg;
        const refId = payload.refno || payload.billpaymentSettlementRefNo || payload.transaction_id;

        console.log('Payment Callback Received:', { status, amount_myr, userId, refId });

        if (status === 'Success' || status === '1' || status === 'paid') {
            if (!userId) {
                return NextResponse.json({ success: false, message: 'Missing User ID' }, { status: 400 });
            }
            if (!Number.isFinite(amount_myr) || amount_myr <= 0) {
                return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
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

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    balance: updatedBalanceMYR,
                    balance_usd: (Number(currentProfile?.balance_usd) || 0) + amount_usd
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // 4. Save the transaction record (RM is the primary amount)
            const finalRefId = refId || `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const { error: txError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: userId,
                    type: 'Deposit',
                    amount: amount_myr,
                    amount_usd: amount_usd,
                    status: 'Approved',
                    ref_id: finalRefId,
                    metadata: { description: `Automated Deposit (RM ${amount_myr}) - USD Equiv: $${amount_usd.toFixed(2)}` }
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
