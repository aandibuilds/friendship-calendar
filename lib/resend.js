/*
  Resend email helper — sends custom invite emails.
  Uses the Resend REST API (no npm package needed).

  Setup: add RESEND_API_KEY to your Vercel env vars.
  Sign up at https://resend.com (free tier: 100 emails/day).

  Without the API key, the invite-friend route returns the link
  for manual sharing instead.
*/

export async function sendInviteEmail({ to, inviterName, token }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: 'no_api_key' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://friendship-calendar.vercel.app';
  const inviteLink = `${siteUrl}/confirm-profile?token=${token}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Friendship Calendar <onboarding@resend.dev>',
      to,
      subject: `${inviterName} invited you to Friendship Calendar!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #7C3AED, #B07ACC); color: white; font-size: 20px; font-weight: 700; line-height: 56px; letter-spacing: -1px;">FC</div>
          </div>
          <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; text-align: center;">You're invited!</h1>
          <p style="font-size: 15px; color: #4B5563; text-align: center; margin: 0 0 28px;">
            <strong>${inviterName}</strong> wants to stay connected with you on Friendship Calendar — an app for nurturing the friendships that matter most.
          </p>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #9F67E4); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 700;">
              Accept Invite
            </a>
          </div>
          <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
            This invite expires in 7 days. If you didn't expect this, you can ignore it.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Resend error:', err);
    return { sent: false, reason: 'send_failed', detail: err };
  }

  return { sent: true };
}
