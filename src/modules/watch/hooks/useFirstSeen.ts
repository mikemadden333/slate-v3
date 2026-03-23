/**
 * useFirstSeen — Tracks which concepts a user has encountered.
 * Stored in localStorage so education moments never repeat after dismissal.
 *
 * "Got it" → marks seen (won't show again this session or future)
 * "Don't show again" → marks permanently dismissed
 */

import { useState, useCallback } from 'react';

export function useFirstSeen(conceptId: string) {
  const key = `pulse_seen_${conceptId}`;
  const dismissKey = `pulse_dismiss_${conceptId}`;

  const [seen, setSeen] = useState(() =>
    localStorage.getItem(key) === 'true' || localStorage.getItem(dismissKey) === 'true',
  );

  const dismissed = localStorage.getItem(dismissKey) === 'true';

  const markSeen = useCallback(() => {
    localStorage.setItem(key, 'true');
    setSeen(true);
  }, [key]);

  const markDismissed = useCallback(() => {
    localStorage.setItem(dismissKey, 'true');
    setSeen(true);
  }, [dismissKey]);

  return { seen, dismissed, markSeen, markDismissed };
}
