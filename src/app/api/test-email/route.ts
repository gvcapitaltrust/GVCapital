import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

// Diagnostic endpoint — visit /api/test-email?to=your@gvcapital.asia in a browser.
// Restricted to your own domain to prevent abuse. Delete this file once email is verified.
export async function GET(req: NextRequest) {
    const to = req.nextUrl.searchParams.get('to') || 'support@gvcapital.asia';
    const key = req.nextUrl.searchParams.get('key');

    // Safety: own domain is unrestricted; external addresses require a key
    const TEST_KEY = 'gv-debug-2026';
    const isOwnDomain = to.toLowerCase().endsWith('@gvcapital.asia');
    if (!isOwnDomain && key !== TEST_KEY) {
        return NextResponse.json(
            { ok: false, error: 'External recipients require ?key=' + TEST_KEY },
            { status: 400 }
        );
    }

    const env = {
        SMTP_HOST: process.env.SMTP_HOST || null,
        SMTP_PORT: process.env.SMTP_PORT || null,
        SMTP_USER: process.env.SMTP_USER || null,
        SMTP_PASS_set: !!process.env.SMTP_PASS,
        SMTP_FROM: process.env.SMTP_FROM || null,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
    };

    console.log('[TEST-EMAIL] Starting send to', to, 'with env', env);

    try {
        const result = await sendEmail({
            to,
            subject: 'GV Capital Trust — SMTP test',
            content: `<h2>SMTP test</h2><p>If you got this, the cPanel SMTP relay is working. Sent at ${new Date().toISOString()}.</p>`,
        });

        console.log('[TEST-EMAIL] Result:', JSON.stringify(result));

        if (!result.success) {
            const err: any = result.error;
            return NextResponse.json({
                ok: false,
                env,
                error: {
                    name: err?.name,
                    message: err?.message,
                    code: err?.code,
                    command: err?.command,
                    response: err?.response,
                    responseCode: err?.responseCode,
                },
            }, { status: 500 });
        }

        return NextResponse.json({ ok: true, env, data: result.data });
    } catch (err: any) {
        console.error('[TEST-EMAIL] Threw:', err);
        return NextResponse.json({
            ok: false,
            env,
            error: {
                name: err?.name,
                message: err?.message,
                code: err?.code,
                stack: err?.stack,
            },
        }, { status: 500 });
    }
}
