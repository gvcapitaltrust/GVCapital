import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // Move this inside the function
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const secret = req.headers.get('x-webhook-secret');
        if (secret !== process.env.KYC_WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ... rest of your code ...import { Resend } from 'resend';
        import { NextRequest, NextResponse } from 'next/server';

        const resend = new Resend(process.env.RESEND_API_KEY);

        export async function POST(req: NextRequest) {
            try {
                // 1. Check Secret first
                const secret = req.headers.get('x-webhook-secret');
                if (secret !== process.env.KYC_WEBHOOK_SECRET) {
                    console.error("Auth Failed");
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
                }

                // 2. Safely get the body
                let body: any;
                const contentType = req.headers.get('content-type');

                if (contentType?.includes('application/json')) {
                    body = await req.json();
                } else {
                    const rawText = await req.text();
                    body = JSON.parse(rawText);
                }

                console.log("Verified Body:", body);

                // 3. Extract data with strong fallbacks
                const email = body?.email || "no-email-found@gvcapital.com";
                const userId = body?.user_id || "no-id";

                // 4. Send the Email
                const { data, error } = await resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: 'gvcapitaltrust@gmail.com',
                    subject: `🔔 KYC Alert: Step 3 Completed`,
                    html: `
        <h3>KYC Update</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p>Check the admin dashboard for details.</p>
      `
                });

                if (error) {
                    console.error("Resend Error:", error);
                    return NextResponse.json({ error }, { status: 500 });
                }

                return NextResponse.json({ success: true });

            } catch (err: any) {
                console.error("Webhook Error:", err.message);
                // Returning a 200 even on parse error helps us see the error in Vercel 
                // without Supabase retrying forever.
                return NextResponse.json({ error: err.message }, { status: 200 });
            }
        }