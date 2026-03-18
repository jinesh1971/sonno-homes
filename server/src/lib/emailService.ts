import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM || "Sonno Homes <onboarding@resend.dev>";

export interface LOINotificationPayload {
  investorName: string;
  offeringTitle: string;
  intendedAmount: number;
  submittedAt: Date;
  adminEmails: string[];
}

export async function sendLOINotification(payload: LOINotificationPayload): Promise<void> {
  const { investorName, offeringTitle, intendedAmount, submittedAt, adminEmails } = payload;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(intendedAmount);

  const formattedDate = submittedAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = `New LOI Submitted: ${offeringTitle}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 24px 28px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 18px;">🏡 New Letter of Intent</h2>
      </div>
      <div style="background: #fff; padding: 24px 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-top: 0;">A new Letter of Intent has been submitted on the Sonno Homes platform.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Investor</td><td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 13px;">${investorName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Offering</td><td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 13px;">${offeringTitle}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Intended Investment</td><td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 13px;">${formattedAmount}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Submitted</td><td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 13px;">${formattedDate}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">Log in to the admin panel to review and take action.</p>
      </div>
    </div>
  `;

  const text = `New LOI Submitted\n\nInvestor: ${investorName}\nOffering: ${offeringTitle}\nIntended Investment: ${formattedAmount}\nSubmitted: ${formattedDate}\n\nLog in to the admin panel to review.`;

  if (!resend) {
    console.log(`[EmailService] LOI Notification (no RESEND_API_KEY — logging only)`);
    console.log(`  To: ${adminEmails.join(", ")}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${text}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmails,
      subject,
      html,
      text,
    });
    console.log(`[EmailService] LOI notification sent to ${adminEmails.join(", ")}`);
  } catch (err) {
    console.error(`[EmailService] Failed to send LOI notification:`, err);
  }
}

export interface FundReportNotificationPayload {
  fundName: string;
  quarterLabel: string;
  investorEmails: string[];
}

export async function sendFundReportNotification(payload: FundReportNotificationPayload): Promise<void> {
  const { fundName, quarterLabel, investorEmails } = payload;
  if (investorEmails.length === 0) return;

  const subject = `Fund Report Published: ${fundName} — ${quarterLabel}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 24px 28px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 18px;">📊 Fund Report Published</h2>
      </div>
      <div style="background: #fff; padding: 24px 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-top: 0;">A new quarterly fund report has been published.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Fund</td><td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 13px;">${fundName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Quarter</td><td style="padding: 8px 0; font-weight: 600; color: #111827; font-size: 13px;">${quarterLabel}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">Log in to your investor portal to view the full report and performance details.</p>
      </div>
    </div>
  `;

  const text = `Fund Report Published\n\nFund: ${fundName}\nQuarter: ${quarterLabel}\n\nLog in to view the full report.`;

  if (!resend) {
    console.log(`[EmailService] Fund Report Notification (no RESEND_API_KEY — logging only)`);
    console.log(`  To: ${investorEmails.join(", ")}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${text}`);
    return;
  }

  try {
    // Resend free tier: send to each individually (batch not available on free)
    for (const email of investorEmails) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject,
        html,
        text,
      });
    }
    console.log(`[EmailService] Fund report notification sent to ${investorEmails.length} investor(s)`);
  } catch (err) {
    console.error(`[EmailService] Failed to send fund report notification:`, err);
  }
}
