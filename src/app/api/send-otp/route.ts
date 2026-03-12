import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        const { userId, email, amount } = await request.json();

        if (!userId || !email) {
            return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in Supabase via Admin Client
        const { error: insertError } = await supabaseAdmin
            .from("otp_codes")
            .insert({
                user_id: userId,
                code: otp,
                expires_at: expiresAt.toISOString(),
            });

        if (insertError) {
            console.error("OTP Insert Error:", insertError);
            return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 });
        }

        // Send email via Resend
        try {
            await resend.emails.send({
                from: "GV Capital Trust <onboarding@resend.dev>", // Or your verified domain
                to: [email],
                subject: "Security Verification Code - GV Capital Trust",
                html: `
                    <div style="font-family: 'Inter', sans-serif; background-color: #000; color: #fff; padding: 40px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #D4AF37;">
                        <img src="https://prmeppkidipenldrrpis.supabase.co/storage/v1/object/public/agreements/logo.png" alt="GV Capital" style="max-height: 50px; margin-bottom: 30px;">
                        <h1 style="color: #D4AF37; font-size: 24px; letter-spacing: 1px; margin-bottom: 20px;">Verification Required</h1>
                        <p style="font-size: 16px; color: #a1a1aa; margin-bottom: 30px;">
                            You requested a withdrawal of <strong>$${amount || "0.00"}</strong>. Please use the following code to authorize this transaction.
                        </p>
                        <div style="background: rgba(212, 175, 55, 0.1); border: 1px dashed #D4AF37; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                            <span style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #D4AF37;">${otp}</span>
                        </div>
                        <p style="font-size: 14px; color: #71717a;">
                            This code will expire in 10 minutes. If you did not request this, please secure your account immediately.
                        </p>
                        <hr style="border: 0; border-top: 1px solid #333; margin: 40px 0;">
                        <p style="font-size: 12px; color: #52525b;">© 2026 GV Capital Trust. All rights reserved.</p>
                    </div>
                `,
            });
        } catch (emailErr) {
            console.error("Email send failed:", emailErr);
            // Even if email fails, return success if we generated it (in dev mode, might be useful)
            // But for production, return error.
            return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "OTP sent to your registered email",
            // In dev mode, you might want to show this, but for security, keep it secret.
            _dev_otp: process.env.NODE_ENV === "development" ? otp : undefined,
        });

    } catch (err: any) {
        console.error("OTP Route Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}