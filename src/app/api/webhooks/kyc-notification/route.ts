import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        // 1. Check Secret
        const secret = req.headers.get('x-webhook-secret');
        if (!process.env.KYC_WEBHOOK_SECRET || secret !== process.env.KYC_WEBHOOK_SECRET) {
            console.error("Auth Failed");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get the body
        const body = await req.json();
        const email = body?.email || "no-email-found@gvcapital.com";
        const userId = body?.user_id || "no-id";

        // 3. Send the Email via SMTP
        const result = await sendEmail({
            to: 'support@gvcapital.asia',
            subject: `🔔 KYC Alert: Step 3 Completed`,
            content: `
                <h3>KYC Update</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>User ID:</strong> ${userId}</p>
            `,
        });

        if (!result.success) {
            console.error('SMTP Error:', result.error);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Webhook Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
