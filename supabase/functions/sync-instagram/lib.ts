export interface IgMedia {
  id: string;
  caption?: string;
  media_type: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

export interface PostRow {
  ig_media_id: string;
  permalink: string;
  caption: string | null;
  media_type: string;
  storage_path: string;
  timestamp: string;
}

// Deterministic Storage object key -> lets sync skip re-downloading existing posts.
export function storageKey(mediaId: string): string {
  return `${mediaId}.jpg`;
}

// Pick the downloadable cover image for a media item.
export function imageSourceUrl(media: IgMedia): string | null {
  if (media.media_type === "VIDEO") {
    return media.thumbnail_url ?? media.media_url ?? null;
  }
  return media.media_url ?? media.thumbnail_url ?? null;
}

// Map an Instagram media object to a DB row.
export function mediaToRow(media: IgMedia): PostRow {
  return {
    ig_media_id: media.id,
    permalink: media.permalink,
    caption: media.caption ?? null,
    media_type: media.media_type,
    storage_path: storageKey(media.id),
    timestamp: media.timestamp,
  };
}

// Return the ids to keep (latest `cap`, newest first).
export function selectRetained(
  items: { id: string; timestamp: string }[],
  cap: number,
): { keep: string[] } {
  const sorted = [...items].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { keep: sorted.slice(0, cap).map((m) => m.id) };
}

// Whether the token should be refreshed given its expiry.
export function needsRefresh(tokenExpiresAt: string, now: Date, thresholdDays = 10): boolean {
  const expires = new Date(tokenExpiresAt).getTime();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  return expires - now.getTime() < thresholdMs;
}
