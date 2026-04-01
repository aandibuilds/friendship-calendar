import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/*
  POST /api/sync-hangout
  Body: { friendId, hangout: { date, activity } }

  When a user logs a hangout with a linked friend, this endpoint
  adds the same hangout to the OTHER user's friend card so both
  sides see it.
*/

export async function POST(req) {
  const { friendId, hangout } = await req.json();
  if (!friendId || !hangout?.date) {
    return NextResponse.json({ error: 'Missing friendId or hangout' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get the friend card to find the linked user
  const { data: friendCard } = await admin
    .from('friends')
    .select('linked_user_id')
    .eq('id', friendId)
    .eq('user_id', user.id)
    .single();

  if (!friendCard?.linked_user_id) {
    // Not a linked friend — nothing to sync
    return NextResponse.json({ synced: false });
  }

  // Find the reverse friend card (the other user's card for this user)
  const { data: reverseCard } = await admin
    .from('friends')
    .select('id, hangouts')
    .eq('user_id', friendCard.linked_user_id)
    .eq('linked_user_id', user.id)
    .single();

  if (!reverseCard) {
    return NextResponse.json({ synced: false });
  }

  // Check for duplicate (same date + activity already exists)
  const existing = reverseCard.hangouts || [];
  const isDuplicate = existing.some(
    h => h.date === hangout.date && h.activity === hangout.activity
  );

  if (isDuplicate) {
    return NextResponse.json({ synced: true, duplicate: true });
  }

  // Append the hangout to the reverse card
  const { error } = await admin
    .from('friends')
    .update({
      hangouts: [...existing, { date: hangout.date, activity: hangout.activity }],
      updated_at: new Date().toISOString(),
    })
    .eq('id', reverseCard.id);

  if (error) {
    console.error('sync-hangout error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }

  return NextResponse.json({ synced: true });
}
