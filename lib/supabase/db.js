import { createClient } from './client';

function client() { return createClient(); }

// ── Auth ─────────────────────────────────────────────────────

export async function getUser() {
  const { data: { user } } = await client().auth.getUser();
  return user;
}

export async function signOut() {
  await client().auth.signOut();
  window.location.href = '/login';
}

// ── Profile ──────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data } = await client().from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function upsertProfile(userId, profile, quiet) {
  const { error } = await client().from('profiles').upsert({
    id: userId,
    name: profile.name || '',
    avatar_color: profile.color || '#7C3AED',
    hobbies: profile.hobbies || [],
    location: profile.location || '',
    birthday: profile.birthday || '',
    bio: profile.bio || '',
    social: profile.social || '',
    vibe: profile.vibe || '',
    quiet_hours_enabled: quiet?.enabled ?? false,
    quiet_hours_start: quiet?.start || '22:00',
    quiet_hours_end: quiet?.end || '08:00',
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('upsertProfile:', error);
}

// ── Friends ──────────────────────────────────────────────────

export async function getFriends(userId) {
  const { data, error } = await client()
    .from('friends')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getFriends:', error); return []; }
  return (data || []).map(dbFriendToApp);
}

export async function addFriend(userId, friend) {
  const row = appFriendToDb(friend, userId);
  const { data, error } = await client().from('friends').insert(row).select().single();
  if (error) { console.error('addFriend:', error); return friend; }
  return dbFriendToApp(data);
}

export async function updateFriend(userId, friend) {
  const { error } = await client()
    .from('friends')
    .update({ ...appFriendToDb(friend, userId), updated_at: new Date().toISOString() })
    .eq('id', friend.id)
    .eq('user_id', userId);
  if (error) console.error('updateFriend:', error);
}

export async function deleteFriend(userId, id) {
  const { error } = await client().from('friends').delete().eq('id', id).eq('user_id', userId);
  if (error) console.error('deleteFriend:', error);
}

// Sync a full friends array (upsert all)
export async function syncFriends(userId, friends) {
  if (!friends.length) return;
  const { error } = await client()
    .from('friends')
    .upsert(friends.map(f => ({ ...appFriendToDb(f, userId), updated_at: new Date().toISOString() })));
  if (error) console.error('syncFriends:', error);
}

function dbFriendToApp(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    color: row.color || '#7C3AED',
    tags: row.tags || [],
    notes: row.notes || '',
    cadence: row.cadence || 30,
    inviteDates: row.invite_dates || [],
    linkedUserId: row.linked_user_id || null,
    hangouts: row.hangouts || [],
  };
}

function appFriendToDb(friend, userId) {
  return {
    id: friend.id,
    user_id: userId,
    name: friend.name,
    email: friend.email || '',
    color: friend.color || '#7C3AED',
    tags: friend.tags || [],
    notes: friend.notes || '',
    cadence: friend.cadence || 30,
    invite_dates: friend.inviteDates || [],
    hangouts: friend.hangouts || [],
  };
}

// ── Events ───────────────────────────────────────────────────

export async function getEvents(userId) {
  const { data, error } = await client()
    .from('events')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getEvents:', error); return []; }
  return (data || []).map(dbEventToApp);
}

export async function addEvent(userId, event) {
  const { data, error } = await client()
    .from('events').insert(appEventToDb(event, userId)).select().single();
  if (error) { console.error('addEvent:', error); return event; }
  return dbEventToApp(data);
}

export async function syncEvents(userId, events) {
  if (!events.length) return;
  const { error } = await client()
    .from('events')
    .upsert(events.map(e => ({ ...appEventToDb(e, userId), updated_at: new Date().toISOString() })));
  if (error) console.error('syncEvents:', error);
}

export async function deleteEvent(userId, id) {
  const { error } = await client().from('events').delete().eq('id', id).eq('creator_id', userId);
  if (error) console.error('deleteEvent:', error);
}

function dbEventToApp(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji || '\u{1F389}',
    type: row.type,
    date: row.date || '',
    time: row.time || '',
    location: row.location || '',
    notes: row.notes || '',
    dates: row.dates || [],
    invitees: row.invitees || [],
    rsvps: row.rsvps || {},
    voteDeadline: row.vote_deadline || '',
    confirmed: row.confirmed || '',
  };
}

function appEventToDb(event, userId) {
  return {
    id: event.id,
    creator_id: userId,
    name: event.name,
    emoji: event.emoji || '\u{1F389}',
    type: event.type,
    date: event.date || '',
    time: event.time || '',
    location: event.location || '',
    notes: event.notes || '',
    dates: event.dates || [],
    invitees: event.invitees || [],
    rsvps: event.rsvps || {},
    vote_deadline: event.voteDeadline || '',
    confirmed: event.confirmed || '',
  };
}

// ── Proposed Events ─────────────────────────────────────────

export async function getProposed(userId) {
  const { data, error } = await client()
    .from('proposed_events')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getProposed:', error); return []; }
  return (data || []).map(dbProposedToApp);
}

export async function syncProposed(userId, proposed) {
  if (!proposed.length) return;
  const { error } = await client()
    .from('proposed_events')
    .upsert(proposed.map(p => appProposedToDb(p, userId)));
  if (error) console.error('syncProposed:', error);
}

export async function deleteProposed(userId, id) {
  const { error } = await client().from('proposed_events').delete().eq('id', id).eq('creator_id', userId);
  if (error) console.error('deleteProposed:', error);
}

function dbProposedToApp(row) {
  return {
    id: row.id,
    type: 'proposed',
    name: row.name,
    date: row.date || '',
    time: row.time || '',
    location: row.location || '',
    desc: row.description || '',
    category: row.category || '',
    sourceUrl: row.source_url || '',
    proposedTo: row.proposed_to || [],
    proposedAt: row.created_at,
  };
}

function appProposedToDb(p, userId) {
  return {
    id: p.id,
    creator_id: userId,
    name: p.name,
    date: p.date || '',
    time: p.time || '',
    location: p.location || '',
    description: p.desc || '',
    category: p.category || '',
    source_url: p.sourceUrl || '',
    proposed_to: p.proposedTo || [],
  };
}
