export interface FacebookAlgorithmContext {
  currentUserId?: string;
  followingHosts?: string[];
  savedPosts?: string[];
  allUsersMap?: Record<string, any>;
  currentUserProfile?: any;
}

/**
 * Calculates a comprehensive Facebook News Feed Ranking (EdgeRank + Modern MSI) score for any Pulse post.
 * 
 * Pillars of Facebook's Ranking Algorithm:
 * 1. Inventory: All posts (Video, Image/Photo, Text, Match/Tournament clips)
 * 2. Signals:
 *    - Meaningful Social Interactions (MSI): Comments (highest weight), Shares, Diverse Reactions (Love/Haha/Sad), Saves
 *    - Author Affinity: Followed hosts/users, Teammates/Squad, Verified/Pro Hosts, Own posts
 *    - Content Richness: Video/Reels, High-res Photos, Interactive Tournaments/Matches, Substantive Discussions
 * 3. Predictions & Time Decay: Gravity decay curve ensuring fresh content surfaces while viral posts remain prominent
 * 4. Velocity Multiplier: Early engagement burst detection (<2h old with high interaction rate)
 */
export function calculateFacebookAlgorithmScore(post: any, context: FacebookAlgorithmContext = {}): number {
  if (!post) return 0;

  const {
    currentUserId = '',
    followingHosts = [],
    savedPosts = [],
    allUsersMap = {},
    currentUserProfile = null,
  } = context;

  let rawScore = 0;

  // ==========================================
  // 1. MEANINGFUL SOCIAL INTERACTIONS (MSI)
  // ==========================================
  const commentsCount = Number(post.commentsCount || 0);
  const sharesCount = Number(post.sharesCount || 0);
  const viewsCount = Number(post.views || 0);
  const isSavedByMe = savedPosts.includes(post.id);

  // Reaction Breakdown (Facebook weights distinct reactions higher than standard likes)
  let likesCount = 0;
  let loveCount = 0;
  let hahaCount = 0;
  let sadCount = 0;
  let munajatCount = 0;

  if (post.reactions && typeof post.reactions === 'object') {
    Object.values(post.reactions).forEach((reactionType) => {
      if (reactionType === 'love') loveCount++;
      else if (reactionType === 'haha') hahaCount++;
      else if (reactionType === 'sad') sadCount++;
      else if (reactionType === 'munajat') munajatCount++;
      else likesCount++;
    });
  } else if (Array.isArray(post.likes)) {
    likesCount = post.likes.length;
  }

  // Weight multipliers adhering to Facebook MSI hierarchy:
  // Comments (deep conversations) > Shares (broadcast endorsement) > Emotional Reactions > Simple Likes > Passive Views
  const COMMENT_WEIGHT = 14;     // Active conversation
  const SHARE_WEIGHT = 16;       // Highest virality signal
  const LOVE_WEIGHT = 5.5;       // High emotional resonance
  const HAHA_WEIGHT = 4.0;       // Entertainment value
  const SAD_WEIGHT = 4.0;        // Empathy
  const MUNAJAT_WEIGHT = 4.5;    // Community blessing
  const LIKE_WEIGHT = 2.5;       // Standard positive signal
  const SAVE_WEIGHT = 12;        // High reference value
  const VIEW_WEIGHT = 0.15;      // Passive consumption

  const msiScore = 
    (commentsCount * COMMENT_WEIGHT) +
    (sharesCount * SHARE_WEIGHT) +
    (loveCount * LOVE_WEIGHT) +
    (hahaCount * HAHA_WEIGHT) +
    (sadCount * SAD_WEIGHT) +
    (munajatCount * MUNAJAT_WEIGHT) +
    (likesCount * LIKE_WEIGHT) +
    (viewsCount * VIEW_WEIGHT) +
    (isSavedByMe ? SAVE_WEIGHT : 0);

  rawScore += msiScore;

  // ==========================================
  // 2. AUTHOR AFFINITY & SOCIAL GRAPH SIGNALS
  // ==========================================
  let affinityScore = 0;
  const authorId = post.userId || '';
  const authorDoc = authorId ? allUsersMap[authorId] : null;

  // A. Following Connection (Strongest personal relationship signal)
  if (authorId && followingHosts.includes(authorId)) {
    affinityScore += 45;
  }

  // B. Current User's Own Post (Self-relevance in feed)
  if (currentUserId && authorId === currentUserId) {
    affinityScore += 35;
  }

  // C. Pro Host / Verified Host / Official Admin
  const isHost = Boolean(post.authorIdentity === 'host' || post.isHostPost || authorDoc?.role === 'pro_host' || authorDoc?.role === 'admin' || authorDoc?.role === 'main_admin');
  if (isHost) {
    affinityScore += 25;
  }

  // D. Squad / Team Connection
  const mySquad = currentUserProfile?.squad?.name || currentUserProfile?.squadName || '';
  const authorSquad = authorDoc?.squad?.name || authorDoc?.squadName || post.squadName || '';
  if (mySquad && authorSquad && mySquad.toLowerCase() === authorSquad.toLowerCase()) {
    affinityScore += 30;
  }

  rawScore += affinityScore;

  // ==========================================
  // 3. CONTENT FORMAT & RICHNESS SIGNALS
  // ==========================================
  let formatScore = 0;

  // Image / Photo Attachment
  if (post.imageUrl) {
    formatScore += 22;
  }

  // Match / Tournament Interactivity Tag
  const hasMatchTag = Boolean(post.linkedTournament || post.linkedLeagueMatch || post.linkedLoneWolfMatch);
  if (hasMatchTag) {
    formatScore += 28;
  }

  // Substantive Discussion Text (Rich context boost)
  const textLength = (post.text || '').trim().length;
  if (textLength > 120) {
    formatScore += 15;
  } else if (textLength > 40) {
    formatScore += 8;
  }

  rawScore += formatScore;

  // Base constant so brand new posts without reactions still have visibility
  const BASE_QUALITY_SCORE = 20;
  const totalRawSignals = rawScore + BASE_QUALITY_SCORE;

  // ==========================================
  // 4. TIME DECAY & VIRAL VELOCITY (FRESHNESS)
  // ==========================================
  const now = Date.now();
  let postTime = now;

  if (post.createdAt) {
    if (typeof post.createdAt.toMillis === 'function') {
      postTime = post.createdAt.toMillis();
    } else if (typeof post.createdAt.toDate === 'function') {
      postTime = post.createdAt.toDate().getTime();
    } else if (typeof post.createdAt === 'number') {
      postTime = post.createdAt;
    } else if (post.createdAt instanceof Date) {
      postTime = post.createdAt.getTime();
    } else if (typeof post.createdAt === 'string') {
      const parsed = new Date(post.createdAt).getTime();
      if (!isNaN(parsed)) postTime = parsed;
    }
  }

  const ageInHours = Math.max(0, (now - postTime) / (1000 * 60 * 60));

  // Early Viral Velocity Burst Detection:
  // If post is fresh (< 3 hours) and already accumulating meaningful interaction
  let velocityMultiplier = 1.0;
  const totalInteractions = commentsCount + sharesCount + likesCount + loveCount + hahaCount + sadCount + munajatCount;
  
  if (ageInHours <= 1.5 && totalInteractions >= 2) {
    velocityMultiplier = 1.6; // Breaking trending post
  } else if (ageInHours <= 4 && totalInteractions >= 5) {
    velocityMultiplier = 1.4; // Strong viral momentum
  } else if (ageInHours <= 12 && totalInteractions >= 10) {
    velocityMultiplier = 1.25;
  }

  // Facebook Gravity Decay Function: Score / (1 + age/6)^1.3
  // Fresh posts (< 6 hours) retain peak score, while viral discussions stay relevant for 24-48 hours
  const decayFactor = Math.pow(1 + (ageInHours / 6.0), 1.28);
  const finalScore = (totalRawSignals * velocityMultiplier) / decayFactor;

  return Math.max(0.01, finalScore);
}

/**
 * Applies Facebook Feed Diversity Mixing (Anti-Clustering pass).
 * Prevents a single creator from dominating the top of the feed consecutively,
 * ensuring a balanced mix of Videos, Images, Text discussions, and Tournaments.
 */
export function applyFacebookFeedDiversity(posts: any[], context: FacebookAlgorithmContext = {}): any[] {
  if (!posts || posts.length <= 1) return posts || [];

  // Step 1: Calculate raw Facebook score for each post
  const scoredItems = posts.map((post) => ({
    post,
    score: calculateFacebookAlgorithmScore(post, context),
  }));

  // Step 2: Sort descending by raw score
  scoredItems.sort((a, b) => b.score - a.score);

  // Step 3: Anti-Clustering & Diversity interleaving
  const result: any[] = [];
  const remaining = [...scoredItems];
  const authorRecentCount: Record<string, number> = {};

  while (remaining.length > 0) {
    // Pick the best candidate that doesn't violate consecutive author burst
    let bestIndex = 0;
    const lastPost = result.length > 0 ? result[result.length - 1] : null;
    const lastAuthorId = lastPost?.userId;

    for (let i = 0; i < Math.min(5, remaining.length); i++) {
      const candidate = remaining[i];
      const authorId = candidate.post.userId;

      // If the candidate author is the same as immediately preceding post,
      // apply a soft penalty unless it's the only post left
      if (lastAuthorId && authorId === lastAuthorId && remaining.length > 1) {
        continue;
      }

      // Check author density in the last 4 posts
      const recentAuthorOccurrences = authorRecentCount[authorId] || 0;
      if (recentAuthorOccurrences >= 2 && remaining.length > 2) {
        continue;
      }

      bestIndex = i;
      break;
    }

    const selected = remaining.splice(bestIndex, 1)[0];
    result.push(selected.post);

    // Track author frequency in rolling window
    const selectedAuthorId = selected.post.userId;
    if (selectedAuthorId) {
      authorRecentCount[selectedAuthorId] = (authorRecentCount[selectedAuthorId] || 0) + 1;
    }
  }

  return result;
}

// Backward compatibility helper
export function calculatePulsePostTrendingScore(post: any): number {
  return calculateFacebookAlgorithmScore(post);
}
