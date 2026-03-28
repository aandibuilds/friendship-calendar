'use client';

// ─── KEYWORD CATEGORY MAP ─────────────────────────────────────
const CATEGORY_KEYWORDS = {
  food:          ['eat', 'food', 'restaurant', 'lunch', 'dinner', 'brunch', 'coffee', 'cafe', 'ramen', 'thai', 'sushi', 'matcha', 'cook', 'bake', 'foodie', 'tasting', 'wine', 'beer', 'cocktail', 'bakery'],
  outdoors:      ['hike', 'hiking', 'trail', 'park', 'outdoor', 'bike', 'biking', 'walk', 'beach', 'camping', 'nature', 'garden', 'gardening', 'run', 'running', 'yoga', 'swim', 'kayak', 'surf'],
  arts:          ['museum', 'gallery', 'art', 'exhibit', 'concert', 'show', 'theater', 'theatre', 'music', 'ceramics', 'pottery', 'crafts', 'painting', 'drawing', 'dance'],
  sports:        ['basketball', 'tennis', 'gym', 'workout', 'fitness', 'rock climbing', 'volleyball', 'soccer', 'golf', 'pickle', 'pickleball', 'skating'],
  entertainment: ['movie', 'film', 'netflix', 'anime', 'ghibli', 'reading', 'book', 'bookstore', 'gaming', 'games', 'trivia', 'puzzle'],
  social:        ['game night', 'party', 'drinks', 'bar', 'happy hour', 'gathering', 'board game', 'karaoke'],
  photography:   ['photography', 'photo', 'camera', 'shoot'],
  market:        ['farmers market', 'market', 'flea market', 'vintage'],
  travel:        ['travel', 'trip', 'road trip', 'weekend away', 'explore', 'city'],
};

const HANGOUT_IDEAS = {
  food: [
    'Try a new restaurant neither of you has been to',
    'Do a Sunday brunch crawl — pick two new spots',
    'Cook a new recipe together at home',
    'Go on a coffee shop tour of your neighborhood',
  ],
  outdoors: [
    'Go on a scenic hike and pack a picnic',
    'Explore a park or nature trail you haven\'t visited',
    'Take a sunrise or golden-hour walk together',
    'Rent bikes and explore a new part of the city',
  ],
  arts: [
    'Visit a museum or gallery exhibit you\'ve both been curious about',
    'Catch a live music show or open mic night',
    'Try a pottery or painting class together',
    'Check out a local art fair or pop-up show',
  ],
  sports: [
    'Book a court for tennis or pickleball',
    'Try a new fitness class together',
    'Go for a morning run or bike ride',
    'Try rock climbing at a local gym',
  ],
  entertainment: [
    'Pick a film series to work through together',
    'Visit a bookstore and pick a book for each other',
    'Host a themed movie night with matching snacks',
    'Find a new binge-worthy show to watch together',
  ],
  social: [
    'Host a low-key game night',
    'Plan a trivia night at a local bar',
    'Do a casual happy hour catch-up',
    'Organize a small group get-together',
  ],
  photography: [
    'Do a photo walk in an interesting neighborhood',
    'Visit a scenic spot and shoot together',
  ],
  market: [
    'Hit the farmers market on a Sunday morning',
    'Check out a flea market or vintage fair',
  ],
  travel: [
    'Plan a day trip to a nearby town you\'ve both wanted to explore',
    'Do a "tourist in your own city" day and visit spots you\'ve never been',
  ],
  default: [
    'Grab coffee and catch up properly — no phones',
    'Take a walk somewhere new in your city',
    'Try an activity neither of you has done before',
    'Plan a day trip somewhere nearby you\'ve both wanted to visit',
  ],
};

// ─── HELPERS ──────────────────────────────────────────────────
function detectCategories(text) {
  const lower = (text || '').toLowerCase();
  const found = new Set();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) found.add(cat);
  }
  return found;
}

function extractInterests(notes) {
  const lower = (notes || '').toLowerCase();
  const patterns = [
    /loves?\s+([\w\s]+?)(?:[,.]|$)/g,
    /into\s+([\w\s]+?)(?:[,.]|$)/g,
    /fan of\s+([\w\s]+?)(?:[,.]|$)/g,
    /obsessed? with\s+([\w\s]+?)(?:[,.]|$)/g,
    /big on\s+([\w\s]+?)(?:[,.]|$)/g,
  ];
  const interests = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(lower)) !== null) {
      const val = m[1].trim();
      if (val.length > 2 && val.length < 35 && !interests.includes(val)) {
        interests.push(val);
      }
    }
  }
  return interests;
}

// ─── CONVERSATION STARTERS ────────────────────────────────────
export function getConvoStarters(friend) {
  const results = [];
  const tags = friend.tags || [];
  const interests = extractInterests(friend.notes);
  const recent = [...(friend.hangouts || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  // From recent hangout activities
  if (recent[0]?.activity) {
    const act = recent[0].activity.toLowerCase();
    results.push(`How's everything been since we last did ${act}?`);
  }
  if (recent[1]?.activity && recent[1].activity !== recent[0]?.activity) {
    const act = recent[1].activity.toLowerCase();
    results.push(`Are you still into ${act}? I'd love to do that again sometime.`);
  }

  // From extracted interests in notes
  if (interests[0]) {
    results.push(`Any new ${interests[0]} recs lately? I know you're a fan.`);
  }
  if (interests[1]) {
    results.push(`How's the ${interests[1]} going these days?`);
  }

  // From tags
  const tagStarters = {
    'Work':       "How's work been going? Anything exciting happening there?",
    'College':    "What's new with you? Feels like we need a proper catch-up.",
    'Childhood':  "What's been going on in your world lately — I want all the updates.",
    'Neighbors':  "Have you noticed anything new happening around the neighborhood?",
    'Family':     "How's the family doing? Anything new on the home front?",
  };
  for (const tag of tags) {
    if (results.length >= 4) break;
    if (tagStarters[tag]) results.push(tagStarters[tag]);
  }

  // Fallbacks
  const fallbacks = [
    "What's been the highlight of your month?",
    "Anything exciting on your radar lately?",
    "What have you been into recently — any new obsessions?",
    "Any shows, books, or places you've been loving?",
    "What's something you've been looking forward to?",
    "What's new in your world — give me the highlights.",
  ];
  for (const fb of fallbacks) {
    if (results.length >= 4) break;
    results.push(fb);
  }

  return results.slice(0, 4);
}

// Rarer categories score higher — they produce more personalized ideas
const SPECIFICITY = {
  photography: 4, arts: 3, market: 3, travel: 3,
  sports: 2, entertainment: 2, social: 2,
  outdoors: 1, food: 1,
};

function sortBySpecificity(cats) {
  return [...cats].sort((a, b) => (SPECIFICITY[b] || 1) - (SPECIFICITY[a] || 1));
}

function ideaMatchesRecent(idea, recentActivities) {
  return recentActivities.some(ra => {
    // Check each meaningful word in the recent activity (length > 4 to skip "at", "the", etc.)
    return ra.split(' ').some(w => w.length > 4 && idea.toLowerCase().includes(w));
  });
}

// ─── HANGOUT IDEAS ────────────────────────────────────────────
export function getHangoutIdeas(friend, profile) {
  const recentActivities = (friend.hangouts || []).slice(-5).map(h => h.activity.toLowerCase());

  const friendText = [friend.notes, ...recentActivities].join(' ');
  const friendCats = detectCategories(friendText);

  const userText = [...(profile?.hobbies || []), ...(profile?.hangtypes || [])].join(' ');
  const userCats = detectCategories(userText);

  const overlapping = sortBySpecificity([...friendCats].filter(c => userCats.has(c)));
  const friendOnly  = sortBySpecificity([...friendCats].filter(c => !userCats.has(c)));
  const userOnly    = sortBySpecificity([...userCats].filter(c => !friendCats.has(c)));

  // Ordered by: shared interests → friend-specific → user-specific → fallback
  const ordered = [...overlapping, ...friendOnly, ...userOnly, 'default'];

  const ideas = [];

  // First pass: 1 idea per category (most specific first)
  for (const cat of ordered) {
    if (ideas.length >= 4) break;
    const pool = (HANGOUT_IDEAS[cat] || []).filter(
      idea => !ideaMatchesRecent(idea, recentActivities) && !ideas.includes(idea)
    );
    if (pool[0]) ideas.push(pool[0]);
  }

  // Second pass: fill remaining slots with next-best from each category
  for (const cat of ordered) {
    if (ideas.length >= 4) break;
    const pool = (HANGOUT_IDEAS[cat] || []).filter(idea => !ideas.includes(idea));
    if (pool[0]) ideas.push(pool[0]);
  }

  return ideas.slice(0, 4);
}
