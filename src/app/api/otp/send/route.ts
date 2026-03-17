import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        if (!userId || !email) {
            return NextResponse.json({ error: 'User ID and Email are required' }, { status:400 });
        }

        // 1. Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // 2. Store OTP in user profile (using metadata or dedicated columns if they exist)
        // Note: For now, we'll try to update the profile directly. 
        // We assume 'otp_code' and 'otp_expires_at' columns exist or we'll use metadata.
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
                otp_code: otp,
                otp_expires_at: expiresAt.toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error storing OTP:', updateError);
            return NextResponse.json({ error: 'Failed to generate OTP. Please ensure the database schema is updated.' }, { status: 500 });
        }

        // 3. Send Email via Resend
        if (process.env.RESEND_API_KEY) {
            try {
                await resend.emails.send({
                    from: 'GV Capital <security@gvcapitaltrust.com>',
                    to: email,
                    subject: 'Your Withdrawal Security Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 10px; border: 1px solid #e0e0e0;">
                                <h1 style="color: #c9a84c; text-align: center; font-size: 24px;">Security Verification</h1>
                                <p style="font-size: 16px; color: #333333; line-height: 1.6;">Hello,</p>
                                <p style="font-size: 16px; color: #333333; line-height: 1.6;">You have requested a withdrawal from your GV Capital account. Please use the following 6-digit code to authorize this transaction:</p>
                                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
                                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000000;">${otp}</span>
                                </div>
                                <p style="font-size: 14px; color: #666666; text-align: center;">This code will expire in 10 minutes. If you did not request this withdrawal, please secure your account immediately.</p>
                                <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
                                <p style="font-size: 12px; color: #999999; text-align: center;">&copy; 2024 GV Capital Trust. All rights reserved.</p>
                            </div>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error('Resend error:', emailError);
                // We'll still return success if the OTP was stored, but alert the admin in logs
            }
        } else {
            console.log('RESEND_API_KEY missing - OTP logged to database for user:', userId, 'Code:', otp);
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });

    } catch (error: any) {
        console.error('OTP Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
