export interface LOINotificationPayload {
  investorName: string;
  offeringTitle: string;
  intendedAmount: number;
  submittedAt: Date;
  adminEmails: string[];
}

/**
 * Sends an LOI notification email to all admin users.
 * In dev mode (no SMTP config), logs to console instead of sending.
 */
export async function sendLOINotification(payload: LOINotificationPayload): Promise<void> {
  const { investorName, offeringTitle, intendedAmount, submittedAt, adminEmails } = payload;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(intendedAmount);

  const formattedDate = submittedAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = `New LOI Submitted: ${offeringTitle}`;
  const body = [
    `A new Letter of Intent has been submitted.`,
    ``,
    `Investor: ${investorName}`,
    `Offering: ${offeringTitle}`,
    `Intended Investment: ${formattedAmount}`,
    `Submitted At: ${formattedDate}`,
  ].join("\n");

  // TODO: Add production SMTP transport via nodemailer when ready.
  // For now, all environments use console logging.
  if (!process.env.SMTP_HOST) {
    console.log(`[EmailService] LOI Notification`);
    console.log(`  To: ${adminEmails.join(", ")}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${body}`);
    return;
  }

  // Production path — requires nodemailer and SMTP env vars.
  // Uncomment and install nodemailer when SMTP is configured:
  // const nodemailer = await import("nodemailer");
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: Number(process.env.SMTP_PORT) || 587,
  //   secure: process.env.SMTP_SECURE === "true",
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASS,
  //   },
  // });
  //
  // await transporter.sendMail({
  //   from: process.env.SMTP_FROM || "noreply@sonnohomes.com",
  //   to: adminEmails,
  //   subject,
  //   text: body,
  // });

  // Fallback: log until nodemailer is installed
  console.log(`[EmailService] LOI Notification (SMTP configured but nodemailer not installed)`);
  console.log(`  To: ${adminEmails.join(", ")}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Body:\n${body}`);
}

export interface FundReportNotificationPayload {
  fundName: string;
  quarterLabel: string; // e.g. "Q2 2025"
  investorEmails: string[];
}

/**
 * Sends a fund report publication notification to all fund investors.
 * Follows the same fire-and-forget pattern as sendLOINotification.
 * In dev mode (no SMTP config), logs to console instead of sending.
 */
export async function sendFundReportNotification(
  payload: FundReportNotificationPayload
): Promise<void> {
  const { fundName, quarterLabel, investorEmails } = payload;

  if (investorEmails.length === 0) return;

  const subject = `Fund Report Published: ${fundName} — ${quarterLabel}`;
  const body = [
    `A new quarterly fund report has been published.`,
    ``,
    `Fund: ${fundName}`,
    `Quarter: ${quarterLabel}`,
    ``,
    `Log in to view the full report and performance details.`,
  ].join("\n");

  try {
    if (!process.env.SMTP_HOST) {
      console.log(`[EmailService] Fund Report Notification`);
      console.log(`  To: ${investorEmails.join(", ")}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Body:\n${body}`);
      return;
    }

    // Production path — requires nodemailer and SMTP env vars.
    // Uncomment and install nodemailer when SMTP is configured.
    console.log(`[EmailService] Fund Report Notification (SMTP configured but nodemailer not installed)`);
    console.log(`  To: ${investorEmails.join(", ")}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${body}`);
  } catch (err) {
    console.error(`[EmailService] Failed to send fund report notification for ${fundName}:`, err);
  }
}

