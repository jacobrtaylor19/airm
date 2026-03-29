import { Resend } from "resend";

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

  const baseUrl = getBaseUrl();
  const setupUrl = `${baseUrl}/setup?token=${inviteToken}`;

  try {
    await client.emails.send({
      from: "Provisum <noreply@provisum.io>",
      to,
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
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] Failed to send invite email:", message);
    return { success: false, error: message };
  }
}
