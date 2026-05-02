"use server";

import { createClient } from "@supabase/supabase-js";
import {
    sendRegistrationEmails as libSendRegistrationEmails,
    sendKYCSubmissionEmail as libSendKYCSubmissionEmail,
    sendKYCVerificationEmails as libSendKYCVerificationEmails,
    sendKYCRejectionEmail as libSendKYCRejectionEmail,
    sendDepositEmails as libSendDepositEmails,
    sendDepositApprovedEmail as libSendDepositApprovedEmail,
    sendDepositRejectedEmail as libSendDepositRejectedEmail,
    sendWithdrawalEmails as libSendWithdrawalEmails,
    sendWithdrawalCompletedEmail as libSendWithdrawalCompletedEmail,
    sendWithdrawalRejectedEmail as libSendWithdrawalRejectedEmail,
    sendDividendEmail as libSendDividendEmail,
    sendFundAccountAssignmentEmail as libSendFundAccountAssignmentEmail,
    sendFundAccountRemovalEmail as libSendFundAccountRemovalEmail
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

// Look up the user's own username on the server side, given their id.
// Used to enrich admin notifications without trusting client-supplied data.
async function lookupUsername(userId: string | null | undefined): Promise<string> {
    if (!userId) return '';
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return '';

    const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data } = await admin
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();

    return data?.username || '';
}

export async function sendRegistrationEmailsAction(
    adminEmail: string,
    userEmail: string,
    inviterId: string | null,
    userName: string,
    _legacyReferralName?: string | null,
    userUsername?: string
) {
    const inviter = await lookupInviter(inviterId);
    return await libSendRegistrationEmails(adminEmail, userEmail, inviter.email, userName, inviter.name, userUsername || '');
}

export async function sendKYCSubmissionEmailAction(adminEmail: string, userName: string, userEmail: string, userUsername?: string) {
    return await libSendKYCSubmissionEmail(adminEmail, userName, userEmail, userUsername || '');
}

export async function sendKYCVerificationEmailsAction(
    userEmail: string,
    inviterId: string | null,
    userName: string,
    _legacyReferralName?: string | null
) {
    const inviter = await lookupInviter(inviterId);
    return await libSendKYCVerificationEmails(userEmail, inviter.email, userName, inviter.name);
}

export async function sendKYCRejectionEmailAction(userEmail: string, userName: string, reason: string) {
    return await libSendKYCRejectionEmail(userEmail, userName, reason);
}

export async function sendDepositEmailsAction(adminEmail: string, userEmail: string, userName: string, amount: string, currency: string, userUsername?: string) {
    return await libSendDepositEmails(adminEmail, userEmail, userName, amount, currency, userUsername || '');
}

export async function sendDepositApprovedEmailAction(userEmail: string, userName: string, amount: string, currency: string) {
    return await libSendDepositApprovedEmail(userEmail, userName, amount, currency);
}

export async function sendDepositRejectedEmailAction(userEmail: string, userName: string, amount: string, currency: string, reason: string) {
    return await libSendDepositRejectedEmail(userEmail, userName, amount, currency, reason);
}

export async function sendWithdrawalEmailsAction(adminEmail: string, userEmail: string, userName: string, amount: string, currency: string, userUsername?: string) {
    return await libSendWithdrawalEmails(adminEmail, userEmail, userName, amount, currency, userUsername || '');
}

export async function sendWithdrawalCompletedEmailAction(userEmail: string, userName: string, amount: string, currency: string) {
    return await libSendWithdrawalCompletedEmail(userEmail, userName, amount, currency);
}

export async function sendWithdrawalRejectedEmailAction(userEmail: string, userName: string, amount: string, currency: string, reason: string) {
    return await libSendWithdrawalRejectedEmail(userEmail, userName, amount, currency, reason);
}

export async function sendDividendEmailAction(userEmail: string, userName: string, amount: string, currency: string) {
    return await libSendDividendEmail(userEmail, userName, amount, currency);
}

export async function sendFundAccountAssignmentEmailAction(userEmail: string, userName: string, fundName: string, allocatedAmountUsd: number) {
    return await libSendFundAccountAssignmentEmail(userEmail, userName, fundName, allocatedAmountUsd);
}

export async function sendFundAccountRemovalEmailAction(userEmail: string, userName: string, fundName: string) {
    return await libSendFundAccountRemovalEmail(userEmail, userName, fundName);
}
