import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '../../../lib/resend';

/*
  POST /api/reset-password
  Body: { email }

  PUBLIC endpoint — generates a password reset link via Supabase Admin API
  and sends it through Resend so the email comes from "Friendship Calendar",
  not from Supabase's default sender.

  Falls back to Supabase's built-in resetPasswordForEmail if Resend
  is not configured.
*/

export async function POST(req) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://friendship-calendar.vercel.app';

  // If Resend is not configured, signal the caller to use Supabase's built-in
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ fallback: true });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Generate a password reset link via Supabase Admin API
  const { data, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/auth/confirm` },
  });

  if (linkErr) {
    // Don't reveal whether the email exists — always show success to the user
    console.error('generateLink error:', linkErr);
    return NextResponse.json({ success: true });
  }

  // The generated link points to Supabase's domain. We need to rewrite it
  // to go through our own /auth/callback route so the session is established
  // on our domain.
  const actionLink = data?.properties?.action_link;
  if (!actionLink) {
    return NextResponse.json({ success: true });
  }

  // Extract token_hash and type from the Supabase action link
  const url = new URL(actionLink);
  const tokenHash = url.searchParams.get('token') || url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') || 'recovery';

  // Build our own reset link that routes through /auth/callback
  const resetLink = `${siteUrl}/auth/callback?token_hash=${tokenHash}&type=${type}`;

  const result = await sendPasswordResetEmail({ to: email, resetLink });

  if (!result.sent) {
    // Resend failed — fall back signal
    return NextResponse.json({ fallback: true });
  }

  return NextResponse.json({ success: true });
}
