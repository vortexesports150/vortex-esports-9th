// Rule-Based Profanity & Inappropriate Language Filter (No AI, Zero-Cost)
// Supports English, Bengali, and Banglish (Romanized Bengali) prohibited words

// Default pre-populated list of prohibited/blocked words and slangs
export const DEFAULT_BLOCKED_WORDS = [
  // English prohibited words
  'fuck', 'fucker', 'fucking', 'shit', 'shitting', 'asshole', 'bitch', 'bitches',
  'bastard', 'cunt', 'dick', 'pussy', 'motherfucker', 'whore', 'slut', 'nigger',
  'retard', 'scum', 'cock', 'bullshit', 'prick', 'twat', 'wanker',

  // Bengali script prohibited words
  'খানকি', 'চোদা', 'মাদারচোদা', 'বোকাচোদা', 'চুদি', 'চুদে', 'চোদাও', 'বাল', 'মাগি', 'বেশ্যা', 'সোনা', 'পেনিস',

  // Banglish (Romanized Bengali) prohibited words
  'khanki', 'khankir', 'choda', 'chodani', 'madarchod', 'madarchoda', 'bokachoda',
  'boka_choda', 'chudi', 'chude', 'chodao', 'baal', 'magi', 'beshya', 'gandu', 'shona', 'baperbaal'
];

/**
 * Normalizes input text by:
 * 1. Converting to lowercase
 * 2. Replacing leetspeak / common symbol substitutions (e.g. @ -> a, $ -> s, 0 -> o, 1 -> i, ! -> i)
 * 3. Removing extra spaces, underscores, dots, or dashes between characters
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  let lower = text.toLowerCase();
  
  // Replace common symbol substitutions
  lower = lower
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    .replace(/\+/g, 't');

  return lower;
}

/**
 * Checks if the given text contains any prohibited/blocked words.
 * Performs exact word boundary checks and continuous pattern checks to catch obfuscations (e.g., "f.u.c.k" or "f_u_c_k").
 * 
 * @param text The comment or post text to validate
 * @param customBlockedWords Optional additional blocked words list fetched from Firestore
 * @returns Object indicating if valid, the detected word (if any), and the user-facing error message.
 */
export function validateProfanityFilter(
  text: string, 
  customBlockedWords?: string[]
): { isValid: boolean; detectedWord?: string; errorMessage?: string } {
  if (!text || !text.trim()) {
    return { isValid: true };
  }

  const rawText = text.trim();
  const normalizedRaw = normalizeText(rawText);
  
  // Strip punctuation & symbols for continuous obfuscation check
  const strippedText = normalizedRaw.replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '');

  const wordList = Array.from(new Set([
    ...DEFAULT_BLOCKED_WORDS,
    ...(customBlockedWords || [])
  ])).filter(w => w && w.trim().length > 0);

  for (const word of wordList) {
    const cleanWord = normalizeText(word.trim());
    if (!cleanWord) continue;

    // 1. Check exact word match or word boundary regex
    const escapedWord = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundaryRegex = new RegExp(`(?:^|\\b|_|\\s)${escapedWord}(?:$|\\b|_|\\s)`, 'i');
    
    if (wordBoundaryRegex.test(normalizedRaw)) {
      return {
        isValid: false,
        detectedWord: word,
        errorMessage: 'Your comment contains inappropriate language. Please edit your comment and try again.'
      };
    }

    // 2. Check stripped continuous text match for obfuscated words (minimum length 3 to prevent false positives)
    if (cleanWord.length >= 3 && strippedText.includes(cleanWord)) {
      return {
        isValid: false,
        detectedWord: word,
        errorMessage: 'Your comment contains inappropriate language. Please edit your comment and try again.'
      };
    }
  }

  return { isValid: true };
}
