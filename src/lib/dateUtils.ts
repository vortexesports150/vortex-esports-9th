/**
 * Gets the Date object for the opening match date and time.
 */
export function getOpeningMatchDateObject(openingMatchDate?: string, openingMatchTime?: string): Date | null {
  if (!openingMatchDate) return null;

  try {
    let year: number = 0;
    let month: number = 0; // 0-indexed
    let day: number = 0;

    const trimmedDate = openingMatchDate.trim();
    if (!trimmedDate) return null;

    // 1. Format: YYYY-MM-DD or YYYY-MM-DDT...
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmedDate)) {
      const datePart = trimmedDate.split('T')[0];
      const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10));
      year = y;
      month = m - 1;
      day = d;
    } else {
      // 2. Format: "3 August 2026" or "August 3, 2026" or standard parseable date string
      const parsed = new Date(trimmedDate);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear();
        month = parsed.getMonth();
        day = parsed.getDate();
      } else {
        return null;
      }
    }

    let hours = 0;
    let minutes = 0;

    if (openingMatchTime && openingMatchTime.trim()) {
      const trimmedTime = openingMatchTime.trim().toUpperCase();
      const isPM = trimmedTime.includes('PM');
      const isAM = trimmedTime.includes('AM');
      const cleanTime = trimmedTime.replace(/(AM|PM)/g, '').trim();
      const parts = cleanTime.split(':').map(p => parseInt(p, 10));
      
      if (!isNaN(parts[0])) {
        let h = parts[0];
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        hours = h;
      }
      if (parts.length > 1 && !isNaN(parts[1])) {
        minutes = parts[1];
      }
    }

    return new Date(year, month, day, hours, minutes, 0, 0);
  } catch (e) {
    console.error('Error parsing opening match date time:', e);
    return null;
  }
}

/**
 * Returns the exact hours remaining until the opening match date and time.
 * Positive = future, Negative = past. Returns null if unparseable.
 */
export function getHoursUntilOpeningMatch(openingMatchDate?: string, openingMatchTime?: string): number | null {
  const matchDate = getOpeningMatchDateObject(openingMatchDate, openingMatchTime);
  if (!matchDate) return null;
  const now = new Date();
  const diffMs = matchDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Checks if the opening match date and time for a league has been reached or passed.
 * Returns true if current time >= opening match date & time.
 */
export function hasOpeningMatchStarted(openingMatchDate?: string, openingMatchTime?: string): boolean {
  const hoursLeft = getHoursUntilOpeningMatch(openingMatchDate, openingMatchTime);
  if (hoursLeft === null) return false;
  return hoursLeft <= 0;
}
