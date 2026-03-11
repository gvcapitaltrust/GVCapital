import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Use exact API Key
const resend = new Resend('re_CSb8jWvb_GWNjGcxSmpifFFZeMHEzywde');

export async function POST(req: Request) {
    try {
        // 1. Verify Webhook Secret
        const secretHeader = req.headers.get('x-webhook-secret');
        const expectedSecret = 'Gvcapital2026!';

        // Match exact specification: Verify header matches
        if (!secretHeader || secretHeader !== expectedSecret) {
            console.error('Webhook unauthorized attempt');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Parse Payload from Supabase Database Webhook
        const payload = await req.json();
        
        // Supabase webhook payload contains the new row in `record`
        const record = payload.record;

        if (!record || !record.email) {
            console.error('Webhook received invalid payload structure', payload);
            return new NextResponse('Invalid payload missing email', { status: 400 });
        }

        const userEmail = record.email;

        // 3. Send Email using Resend
        // send email From/To: gvcapital@gmail.com
        const { error } = await resend.emails.send({
            from: 'gvcapital@gmail.com',
            to: 'gvcapital@gmail.com',
            subject: 'New KYC Submission: Profile Awaiting Review',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <p style="color: #333; font-size: 16px;">
                        KYC Step 3 Completed. User Email: <strong>${userEmail}</strong>. Please log in to the Admin Panel to review.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('Resend Error:', error);
            return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'KYC Admin notification sent successfully' });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
