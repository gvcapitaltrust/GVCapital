"use server";

import { 
    sendRegistrationEmails as libSendRegistrationEmails,
    sendKYCSubmissionEmail as libSendKYCSubmissionEmail,
    sendKYCVerificationEmails as libSendKYCVerificationEmails,
    sendDepositEmails as libSendDepositEmails,
    sendWithdrawalEmails as libSendWithdrawalEmails,
    sendDividendEmail as libSendDividendEmail
} from "@/lib/email";

export async function sendRegistrationEmailsAction(adminEmail: string, userEmail: string, referralEmail: string | null, userName: string, referralName: string | null) {
    return await libSendRegistrationEmails(adminEmail, userEmail, referralEmail, userName, referralName);
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
