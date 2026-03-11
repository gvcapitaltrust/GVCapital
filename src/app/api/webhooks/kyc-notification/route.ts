import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // Move the constructor inside the function to prevent build errors
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        // 1. Check Secret
        const secret = req.headers.get('x-webhook-secret');
        if (secret !== process.env.KYC_WEBHOOK_SECRET) {
            console.error("Auth Failed");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get the body
        const body = await req.json();
        const email = body?.email || "no-email-found@gvcapital.com";
        const userId = body?.user_id || "no-id";

        // 3. Send the Email
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'gvcapitaltrust@gmail.com',
            subject: `🔔 KYC Alert: Step 3 Completed`,
            html: `
        <h3>KYC Update</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>User ID:</strong> ${userId}</p>
      `
        });

        if (error) {
            console.error("Resend Error:", error);
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Webhook Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}