import { Resend } from "resend";
import { getSetting } from "@/lib/settings";
import { reportError } from "@/lib/monitoring";

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Default from address used when no setting is configured */
const DEFAULT_FROM = "Provisum <notifications@provisum.io>";

/**
 * Read email settings from DB. Returns null if email is disabled.
 */
async function getEmailConfig(): Promise<{
  from: string;
  replyTo?: string;
} | null> {
  try {
    const enabled = await getSetting("email_enabled");
    if (enabled === "false") {
      return null;
    }

    const fromAddress = await getSetting("email_from_address");
    const replyTo = await getSetting("email_reply_to");

    return {
      from: fromAddress || DEFAULT_FROM,
      ...(replyTo ? { replyTo } : {}),
    };
  } catch {
    // If settings can't be read (e.g. during build), fall back to defaults
    return { from: DEFAULT_FROM };
  }
}

export async function sendInviteEmail(
  to: string,
  inviteToken: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping invite email to", to);
    return { success: true }; // graceful degradation
  }

  const config = await getEmailConfig();
  if (!config) {
    console.info("[email] Email disabled via settings — skipping invite email to", to);
    return { success: true };
  }

  const baseUrl = getBaseUrl();
  const setupUrl = `${baseUrl}/setup?token=${inviteToken}`;

  try {
    await client.emails.send({
      from: config.from,
      to,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      subject: "You've been invited to Provisum",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #111;">Welcome to Provisum</h1>
          <p style="font-size: 16px; color: #555; line-height: 1.5;">
            Hi ${displayName},
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.5;">
            You've been invited to join Provisum. Click the button below to set your password and activate your account.
          </p>
          <div style="margin: 32px 0;">
            <a href="${setupUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
              Set Your Password
            </a>
          </div>
          <p style="font-size: 13px; color: #999; line-height: 1.5;">
            This link expires in 24 hours. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="font-size: 13px; color: #999;">
            Or copy and paste this URL: ${setupUrl}
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    reportError(err, { context: "sendInviteEmail", to });
    const message = err instanceof Error ? err.message : "Unknown email error";
    return { success: false, error: message };
  }
}

/**
 * Send a workflow notification email.
 * Gracefully degrades if RESEND_API_KEY is not set or email is disabled.
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  message: string,
  actionUrl?: string,
): Promise<{ sent: boolean; error?: string }> {
  const client = getResendClient();
  if (!client) {
    return { sent: false, error: "Email service not configured" };
  }

  const config = await getEmailConfig();
  if (!config) {
    return { sent: false, error: "Email disabled via settings" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://demo.provisum.io";
  const actionButton = actionUrl
    ? `<a href="${appUrl}${actionUrl}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Details</a>`
    : "";

  try {
    await client.emails.send({
      from: config.from,
      to,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      subject: `[Provisum] ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1f2937;">Provisum Notification</h2>
          </div>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">${message}</p>
          ${actionButton}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            You received this because you have notifications enabled in Provisum.
            <a href="${appUrl}/notifications" style="color: #10b981;">View all notifications</a>
          </p>
        </div>
      `,
    });
    return { sent: true };
  } catch (err) {
    reportError(err, { context: "sendNotificationEmail", to, subject });
    return { sent: false, error: String(err) };
  }
}

/**
 * Send a test email to verify configuration.
 */
export async function sendTestEmail(
  to: string,
): Promise<{ success: boolean; error?: string }> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: "RESEND_API_KEY environment variable is not set" };
  }

  const config = await getEmailConfig();
  if (!config) {
    return { success: false, error: "Email is disabled in settings" };
  }

  try {
    await client.emails.send({
      from: config.from,
      to,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      subject: "[Provisum] Test Email",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #111;">Test Email</h1>
          <p style="font-size: 16px; color: #555; line-height: 1.5;">
            This is a test email from Provisum. If you received this, your email configuration is working correctly.
          </p>
          <div style="margin: 24px 0; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
            <p style="margin: 0; color: #166534; font-size: 14px;">
              <strong>From:</strong> ${config.from}<br/>
              ${config.replyTo ? `<strong>Reply-To:</strong> ${config.replyTo}<br/>` : ""}
              <strong>Sent at:</strong> ${new Date().toISOString()}
            </p>
          </div>
          <p style="font-size: 13px; color: #999;">
            Sent from the Provisum Admin Console.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    reportError(err, { context: "sendTestEmail", to });
    const message = err instanceof Error ? err.message : "Unknown email error";
    return { success: false, error: message };
  }
}

/**
 * Send email to multiple recipients.
 */
export async function sendBulkNotificationEmails(
  recipients: { email: string; displayName: string }[],
  subject: string,
  message: string,
  actionUrl?: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const personalizedMessage = message.replace("{name}", recipient.displayName);
    const result = await sendNotificationEmail(recipient.email, subject, personalizedMessage, actionUrl);
    if (result.sent) sent++;
    else failed++;
  }

  return { sent, failed };
}
