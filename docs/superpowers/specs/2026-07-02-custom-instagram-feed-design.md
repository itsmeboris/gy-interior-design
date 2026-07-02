# Custom Instagram Feed — Design

**Date:** 2026-07-02
**Status:** Approved (pending spec review)

## Goal

Replace the Behold-based portfolio feed with a self-hosted pipeline that pulls
posts directly from the Instagram Graph API, caches them in Supabase, and renders
them in the existing portfolio grid style. This removes Behold's free-plan limits
(6-post cap, no server-side filtering) and gives full control over the feed.

## Non-goals

- No manual per-post curation UI (feed is automatic; hiding is a DB flag).
- No Instagram comments, likes counts, or profile stats.
- No carousel child-image browsing — the grid shows one cover image per post
  (matches current behavior).
- No "load more"/pagination in v1 (display count is small and fixed).

## Constraints this design must handle

1. **Instagram media URLs expire** (CDN links valid only hours–days). Therefore we
   **download each image into Supabase Storage** and serve stable URLs from there,
   rather than hotlinking Instagram URLs.
2. **Access token expires (~60 days).** The long-lived token is stored server-side
   and the sync **auto-refreshes** it before expiry. The token is never exposed to
   the frontend bundle.
3. **No Meta app review required.** We only read the account's *own* media, which
   works in the app's development mode with the account as owner/tester. This avoids
   Meta's app-review process.

## Configuration values

| Setting | Value | Notes |
|---|---|---|
| Posts displayed on site | 12 | Newest-first, minus hidden. One-line change to adjust. |
| Retention cap (stored) | 50 | Rows + Storage images beyond this are deleted on sync. Expandable. |
| Sync frequency | Daily | Scheduled; also manually invokable. |
| Token refresh threshold | Refresh when < 10 days to expiry | i.e., token age > ~50 days. |

## Architecture

```
Instagram Graph API
      │  (scheduled daily; also manual)
      ▼
Edge Function: sync-instagram
   1. Read token/config from instagram_config
   2. Refresh token if near expiry; persist new token + expiry
   3. Fetch latest posts (fields: id, caption, media_type, media_url,
      thumbnail_url, permalink, timestamp), up to retention cap
   4. For each post: if image not already in Storage (keyed by media id),
      download media_url (or thumbnail_url for video) → upload to Storage
   5. Upsert rows into instagram_posts (by ig_media_id)
   6. Reconcile: delete Storage objects + rows that are orphaned or beyond
      the retention cap
      │
      ▼
Supabase: instagram_posts (table) + instagram-media (Storage bucket)
      │
      ▼
Frontend Portfolio.tsx
   query instagram_posts where is_hidden = false, order by timestamp desc,
   limit 12 → render existing grid (square tiles, hover overlay, links to post)
```

## Data model

### Table `instagram_posts`
| Column | Type | Notes |
|---|---|---|
| id | uuid (pk) | Supabase row id |
| ig_media_id | text (unique) | Instagram media id — upsert key, Storage key |
| permalink | text | Instagram post URL |
| caption | text | May be null |
| media_type | text | IMAGE / VIDEO / CAROUSEL_ALBUM |
| storage_path | text | Path within instagram-media bucket |
| dominant_color | text | Optional, "r,g,b" for loading placeholder |
| timestamp | timestamptz | Instagram post time (sort key) |
| is_hidden | boolean | Default false. Replaces hardcoded exclude-list |
| created_at | timestamptz | Row insert time |

**RLS:** public `SELECT` allowed (only non-sensitive display data). Writes only via
service role (the Edge Function). Mirrors the existing Testimonials table policy.

### Table `instagram_config` (single row)
| Column | Type | Notes |
|---|---|---|
| id | int (pk, = 1) | Enforced single row |
| ig_user_id | text | Instagram business account id |
| access_token | text | Long-lived token (secret) |
| token_expires_at | timestamptz | Used to decide refresh |

**RLS:** no public access at all. Read/written only by the service-role Edge Function.

### Storage bucket `instagram-media`
- Public read, service-role write.
- Object key: `{ig_media_id}.jpg` (deterministic → skip-if-exists prevents duplicates).

## Edge Function `sync-instagram`

Follows the existing `supabase/functions/send-contact-email` pattern (Deno, service-role client).

Steps:
1. Load `instagram_config`.
2. If `token_expires_at` is within the refresh threshold, call the Graph API
   `refresh_access_token` endpoint and persist the new token + expiry.
3. Fetch media list for `ig_user_id` (latest, up to retention cap).
4. For each post, choose the image source: `media_url` for images/carousels,
   `thumbnail_url` for videos. If `{ig_media_id}.jpg` is not already in Storage,
   download and upload it.
5. Upsert the row into `instagram_posts` keyed by `ig_media_id`.
6. Reconcile: compute the set of kept posts (latest 50 by timestamp). Delete rows +
   Storage objects for anything outside that set or no longer returned by Instagram.

**Idempotency & cleanup:** deterministic Storage keys + skip-if-exists mean re-syncing
existing posts is free; reconcile bounds total storage to the retention cap.

**Trigger:** scheduled daily (Supabase scheduled function / pg_cron + pg_net). Manually
invokable for testing and on-demand refresh.

## Frontend changes

`src/components/Portfolio.tsx`:
- Remove the Behold feed `fetch`.
- Query Supabase (`supabase.from('instagram_posts')...`) exactly like `Testimonials.tsx`.
- Map rows to the existing grid markup (square tiles, dominant-color placeholder,
  zoom-fade hover overlay + Instagram icon, link to `permalink` in a new tab).
- The hardcoded `EXCLUDED_SHORTCODES` list is removed; hiding is now the `is_hidden`
  column (toggle in the Supabase dashboard, no code change/deploy).

No visual change — same single-column-friendly grid the site uses today. (Current
layout: centered, square tiles; retained as-is.)

## Error handling

- Sync failure (API/network) leaves existing cached posts intact — never wipes the
  gallery.
- A single post's image-download failure is logged and skipped; other posts still sync.
- Token refresh failure is logged loudly (surfaces the need to re-auth before the
  token fully expires).

## Security

- Access token and `instagram_config` are server-side only, RLS-locked, never shipped
  to the client.
- Only `instagram_posts` (display data) is publicly readable.
- Storage bucket is read-only to the public; writes require service role.

## Manual one-time setup (user, outside this codebase)

Provided as a step-by-step guide during implementation. Summary:
1. Create a Meta Developer app; add the Instagram Graph API product.
2. Link the Instagram business account to a Facebook Page.
3. Generate a long-lived access token and note the IG user id.
4. Insert token + ids into `instagram_config` (one row).

No app review needed (own-account, development mode).

## Testing

- Unit-test the transform (Graph API media object → `instagram_posts` row).
- Unit-test the reconcile/retention logic (given N posts, correct set kept/deleted).
- Run `supabase functions serve sync-instagram` locally against a real token; verify
  rows + Storage objects appear and re-runs don't duplicate.
- Verify the frontend renders from the table and hiding via `is_hidden` works.

## Future (out of scope for v1)

- "Load more"/pagination for a larger gallery.
- Carousel child-image lightbox.
- Raising display count / retention cap (config-only changes).
