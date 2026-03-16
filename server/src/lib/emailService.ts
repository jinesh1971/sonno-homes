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
