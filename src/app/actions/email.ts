"use server";

import { createClient } from "@supabase/supabase-js";
import {
    sendRegistrationEmails as libSendRegistrationEmails,
    sendKYCSubmissionEmail as libSendKYCSubmissionEmail,
    sendKYCVerificationEmails as libSendKYCVerificationEmails,
    sendDepositEmails as libSendDepositEmails,
    sendWithdrawalEmails as libSendWithdrawalEmails,
    sendDividendEmail as libSendDividendEmail
} from "@/lib/email";

async function lookupInviter(inviterId: string | null): Promise<{ email: string | null; name: string | null }> {
    if (!inviterId) return { email: null, name: null };
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return { email: null, name: null };

    const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data } = await admin
        .from('profiles')
        .select('email, full_name, username')
        .eq('id', inviterId)
        .maybeSingle();

    return {
        email: data?.email || null,
        name: data?.full_name || data?.username || null,
    };
}

export async function sendRegistrationEmailsAction(
    adminEmail: string,
    userEmail: string,
    inviterId: string | null,
    userName: string,
    _legacyReferralName?: string | null
) {
    const inviter = await lookupInviter(inviterId);
    return await libSendRegistrationEmails(adminEmail, userEmail, inviter.email, userName, inviter.name);
}

export async function sendKYCSubmissionEmailAction(adminEmail: string, userName: string, userEmail: string) {
    return await libSendKYCSubmissionEmail(adminEmail, userName, userEmail);
}

export async function sendKYCVerificationEmailsAction(userEmail: string, referralEmail: string | null, userName: string, referralName: string | null) {
    return await libSendKYCVerificationEmails(userEmail, referralEmail, userName, referralName);
}

export async function sendDepositEmailsAction(adminEmail: string, userEmail: string, userName: string, amount: string, currency: string) {
    return await libSendDepositEmails(adminEmail, userEmail, userName, amount, currency);
}

export async function sendWithdrawalEmailsAction(adminEmail: string, userEmail: string, userName: string, amount: string, currency: string) {
    return await libSendWithdrawalEmails(adminEmail, userEmail, userName, amount, currency);
}

export async function sendDividendEmailAction(userEmail: string, userName: string, amount: string, currency: string) {
    return await libSendDividendEmail(userEmail, userName, amount, currency);
}
