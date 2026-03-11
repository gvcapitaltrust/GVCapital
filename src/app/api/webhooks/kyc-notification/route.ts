import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        // 1. Log Headers (To check the Secret)
        const secret = req.headers.get('x-webhook-secret');
        console.log("DEBUG: Secret Received:", secret);

        if (secret !== process.env.KYC_WEBHOOK_SECRET) {
            console.error("DEBUG: 401 Unauthorized - Secret Mismatch");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Capture the Raw Body first
        const rawBody = await req.text();
        console.log("DEBUG: Raw Body String:", rawBody);

        if (!rawBody) {
            return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
        }

        // 3. Try to parse it
        const body = JSON.parse(rawBody);
        const email = body.email;
        const userId = body.user_id;

        console.log("DEBUG: Parsed Email:", email);

        // 4. Send Email (using the fallback if email is still null)
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'gvcapitaltrust@gmail.com',
            subject: `🔔 KYC Step 3: ${email || 'New User'}`,
            html: `
        <h3>KYC Completion Alert</h3>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <p><strong>User ID:</strong> ${userId || 'Not provided'}</p>
        <hr />
        <p>Raw Data for Debugging: <code>${rawBody}</code></p>
      `
        });

        if (error) {
            console.error("Resend API Error:", error);
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("WEBHOOK CRASH:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}