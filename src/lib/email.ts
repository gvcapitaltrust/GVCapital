import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const BRAND_COLOR = '#9A7D2E'; // GV Gold
const BG_COLOR = '#FAFAF8';
const TEXT_COLOR = '#1a1a1a';
const SECONDARY_TEXT = '#4b5563';

/**
 * Base Institutional HTML Template
 */
const getBaseTemplate = (content: string, previewText: string = "Update from GV Capital Trust") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GV Capital Trust</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: ${TEXT_COLOR};
      background-color: ${BG_COLOR};
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      padding: 40px 20px;
      text-align: center;
      background: white;
      border-bottom: 2px solid ${BRAND_COLOR};
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: ${TEXT_COLOR};
      letter-spacing: 2px;
      margin: 0;
    }
    .content {
      padding: 40px;
    }
    .footer {
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: ${SECONDARY_TEXT};
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${BRAND_COLOR};
      color: white !important;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      margin-top: 20px;
    }
    .highlight {
      color: ${BRAND_COLOR};
      font-weight: 700;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }
    .disclaimer {
      font-style: italic;
      margin-top: 20px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${previewText}
  </div>
  <div class="container">
    <div class="header">
      <h1 class="logo">GV CAPITAL <span style="color: ${BRAND_COLOR};">TRUST</span></h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} GV Capital Trust. All rights reserved.</p>
      <p class="disclaimer">
        This email is intended solely for the addressee and contains confidential information. 
        GV Capital Trust is a regulated financial institution. Past performance is not indicative of future results.
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send Email utility
 */
export async function sendEmail({ to, subject, content, previewText }: { to: string | string[], subject: string, content: string, previewText?: string }) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'GV Capital Trust <notifications@gvcapital.com>', // Replace with your verified domain
      to,
      subject,
      html: getBaseTemplate(content, previewText || subject),
    });

    if (error) {
      console.error('RESEND_ERROR:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('EMAIL_SEND_FAILURE:', err);
    return { success: false, error: err };
  }
}

// Scenarios

/**
 * 1. New user registration
 */
export async function sendRegistrationEmails(adminEmail: string, userEmail: string, referralEmail: string | null, userName: string, referralName: string | null) {
  // To Admin
  await sendEmail({
    to: adminEmail,
    subject: `🔔 New User Registration: ${userName}`,
    content: `
      <h2>New Member Joined</h2>
      <p>A new user has registered on the platform.</p>
      <p><strong>Name:</strong> ${userName}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      ${referralName ? `<p><strong>Referred by:</strong> ${referralName}</p>` : ''}
      <a href="#" class="button">Review Profile</a>
    `
  });

  // To User
  await sendEmail({
    to: userEmail,
    subject: `Welcome to GV Capital Trust, ${userName}`,
    content: `
      <h2>Welcome Aboard</h2>
      <p>Dear ${userName},</p>
      <p>Thank you for choosing <span class="highlight">GV Capital Trust</span> for your financial journey. Your account has been successfully created.</p>
      <p>To start exploring our institutional-grade investment management services, please log in to your dashboard.</p>
      <div class="divider"></div>
      <p><strong>Next Step:</strong> Complete your KYC verification to unlock full account features.</p>
      <a href="#" class="button">Go to Dashboard</a>
    `
  });

  // To Referral
  if (referralEmail && referralName) {
    await sendEmail({
      to: referralEmail,
      subject: `Friend Joined: ${userName}`,
      content: `
        <h2>Growing Your Network</h2>
        <p>Dear ${referralName},</p>
        <p>We're pleased to inform you that your friend <span class="highlight">${userName}</span> has successfully registered using your referral link.</p>
        <p>Once they complete their first deposit, your referral rewards will be credited to your account.</p>
        <a href="#" class="button">View Referral Team</a>
      `
    });
  }
}

/**
 * 2. KYC Submission
 */
export async function sendKYCSubmissionEmail(adminEmail: string, userName: string, userEmail: string) {
  await sendEmail({
    to: adminEmail,
    subject: `📦 KYC Submission Alert: ${userName}`,
    content: `
      <h2>KYC Documents Received</h2>
      <p>A user has submitted their KYC documents for review.</p>
      <p><strong>User:</strong> ${userName}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p>Please review the documents in the admin panel and update their verification status.</p>
      <a href="#" class="button">Review KYC</a>
    `
  });
}

/**
 * 3. KYC Verification Success
 */
export async function sendKYCVerificationEmails(userEmail: string, referralEmail: string | null, userName: string, referralName: string | null) {
  // To User
  await sendEmail({
    to: userEmail,
    subject: `✅ Identity Verified: GV Capital Trust`,
    content: `
      <h2>Verification Complete</h2>
      <p>Dear ${userName},</p>
      <p>We are pleased to inform you that your identity verification (KYC) has been <span class="highlight">successfully verified</span>.</p>
      <p>Your account is now fully active, and you can begin making deposits and managing your investments.</p>
      <a href="#" class="button">Make Your First Deposit</a>
    `
  });

  // To Referral
  if (referralEmail && referralName) {
    await sendEmail({
      to: referralEmail,
      subject: `Friend Verified: ${userName}`,
      content: `
        <h2>Network Milestone</h2>
        <p>Dear ${referralName},</p>
        <p>Your referred friend <span class="highlight">${userName}</span> has completed their KYC verification.</p>
        <p>Your referral stats have been updated accordingly.</p>
      `
    });
  }
}

/**
 * 4. Deposit
 */
export async function sendDepositEmails(adminEmail: string, userEmail: string, userName: string, amount: string, currency: string = "USD") {
  const formattedAmount = `${currency} ${amount}`;
  
  // To Admin
  await sendEmail({
    to: adminEmail,
    subject: `💰 New Deposit Alert: ${formattedAmount}`,
    content: `
      <h2>Deposit Request Received</h2>
      <p>A new deposit has been reported on the platform.</p>
      <p><strong>User:</strong> ${userName}</p>
      <p><strong>Amount:</strong> <span class="highlight">${formattedAmount}</span></p>
      <p>Please cross-reference with bank records and confirm the transaction.</p>
      <a href="#" class="button">Manage Deposits</a>
    `
  });

  // To User
  await sendEmail({
    to: userEmail,
    subject: `Confirmation: Deposit Request Received`,
    content: `
      <h2>Deposit under Review</h2>
      <p>Dear ${userName},</p>
      <p>We have received your deposit request of <span class="highlight">${formattedAmount}</span>.</p>
      <p>Our team is currently verifying the transaction. Funds will be reflected in your wallet once confirmed (usually within 12-24 hours).</p>
      <div class="divider"></div>
      <p>Thank you for your continued trust in GV Capital.</p>
    `
  });
}

/**
 * 5. Withdrawal
 */
export async function sendWithdrawalEmails(adminEmail: string, userEmail: string, userName: string, amount: string, currency: string = "USD") {
  const formattedAmount = `${currency} ${amount}`;

  // To Admin
  await sendEmail({
    to: adminEmail,
    subject: `💸 Withdrawal Request: ${formattedAmount}`,
    content: `
      <h2>Withdrawal Alert</h2>
      <p>A user has requested a withdrawal.</p>
      <p><strong>User:</strong> ${userName}</p>
      <p><strong>Amount:</strong> <span class="highlight">${formattedAmount}</span></p>
      <p>Please review the request and proceed with the payout.</p>
      <a href="#" class="button">Manage Withdrawals</a>
    `
  });

  // To User
  await sendEmail({
    to: userEmail,
    subject: `Withdrawal Request Received: ${formattedAmount}`,
    content: `
      <h2>Withdrawal Processing</h2>
      <p>Dear ${userName},</p>
      <p>Your withdrawal request for <span class="highlight">${formattedAmount}</span> has been received.</p>
      <p>Your request is currently being processed by our finance team. You will be notified once the funds have been dispatched to your designated account.</p>
      <div class="divider"></div>
      <p>Transaction ID: ${Math.random().toString(36).substring(7).toUpperCase()}</p>
    `
  });
}

/**
 * 6. Dividend
 */
export async function sendDividendEmail(userEmail: string, userName: string, amount: string, currency: string = "USD") {
  const formattedAmount = `${currency} ${amount}`;

  await sendEmail({
    to: userEmail,
    subject: `✨ Dividend Payment Received: ${formattedAmount}`,
    content: `
      <h2>Your Assets are Working</h2>
      <p>Dear ${userName},</p>
      <p>We are pleased to announce that a dividend of <span class="highlight">${formattedAmount}</span> has been credited to your account.</p>
      <p>This payment represents your share of the profits generated by our institutional management strategies.</p>
      <div class="divider"></div>
      <p>Log in to your dashboard to view your updated balance and performance history.</p>
      <a href="#" class="button">View Performance</a>
    `
  });
}
