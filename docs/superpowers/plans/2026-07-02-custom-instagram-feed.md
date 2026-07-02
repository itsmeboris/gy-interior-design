# Custom Instagram Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Behold portfolio feed with a self-hosted pipeline that pulls Instagram posts via the Graph API, caches them (table + Storage) in Supabase, and renders them in the existing grid.

**Architecture:** A scheduled Supabase Edge Function (`sync-instagram`) reads a server-side token, fetches the latest posts from `graph.instagram.com`, downloads each cover image into a public Storage bucket (deterministic keys, skip-if-exists), upserts rows into `instagram_posts`, and reconciles to the latest 50. The React `Portfolio` component queries that table (like `Testimonials`) and renders from Storage.

**Tech Stack:** Supabase (Postgres + RLS + Storage + Edge Functions/Deno), Instagram API with Instagram Login (`graph.instagram.com`), React + Vite + TypeScript, Tailwind. Deno test runner for pure logic.

---

## Configuration constants (used throughout)

- `RETENTION_CAP = 50` (rows + Storage images kept)
- `DISPLAY_COUNT = 12` (posts shown on site)
- Token refresh threshold: refresh when `< 10 days` to expiry
- Storage bucket: `instagram-media` (public read)
- Project ref: `gokoxjavfixchaedxdvm`
- Function URL: `https://gokoxjavfixchaedxdvm.supabase.co/functions/v1/sync-instagram`

## File structure

- Create: `supabase/migrations/20260702120000_instagram_feed.sql` — tables, RLS, Storage bucket.
- Create: `supabase/functions/sync-instagram/lib.ts` — pure helpers (testable, no I/O).
- Create: `supabase/functions/sync-instagram/lib_test.ts` — Deno unit tests.
- Create: `supabase/functions/sync-instagram/index.ts` — orchestration (I/O).
- Modify: `supabase/config.toml` — register `sync-instagram`.
- Modify: `src/integrations/supabase/types.ts` — add `InstagramPost` type.
- Modify: `src/components/Portfolio.tsx` — query Supabase instead of Behold.
- Create: `supabase/migrations/20260702130000_instagram_cron.sql` — daily schedule (applied after deploy).
- Create: `docs/instagram-meta-setup.md` — one-time Meta setup + secrets guide.

> **Dependency note:** Tasks 1–4 build and unit-test the code with no live Instagram data. The **live** verification in Task 5 and the first real render require the **manual Meta setup in Task 6** to have been done (token inserted into `instagram_config`). Task 6 can be done any time before Task 5's live run.

---

### Task 1: Database schema + Storage bucket

**Files:**
- Create: `supabase/migrations/20260702120000_instagram_feed.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260702120000_instagram_feed.sql`:

```sql
-- Display data for the portfolio grid (publicly readable).
create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  ig_media_id text unique not null,
  permalink text not null,
  caption text,
  media_type text not null,
  storage_path text not null,
  dominant_color text,
  timestamp timestamptz not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.instagram_posts enable row level security;

-- Anyone may read posts; writes happen only via the service role (bypasses RLS).
create policy "Public can read instagram posts"
  on public.instagram_posts for select
  using (true);

-- Secrets: token + config. No public access at all.
create table if not exists public.instagram_config (
  id int primary key default 1,
  ig_user_id text,
  access_token text not null,
  token_expires_at timestamptz not null,
  constraint instagram_config_singleton check (id = 1)
);

alter table public.instagram_config enable row level security;
-- No policies -> anon/auth have no access. Service role bypasses RLS.

-- Public bucket for cached images (public read via public URLs).
insert into storage.buckets (id, name, public)
values ('instagram-media', 'instagram-media', true)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase Dashboard → SQL Editor (paste the file contents and run), OR if the Supabase CLI is linked: `supabase db push`.

- [ ] **Step 3: Verify the schema exists**

In the SQL Editor run:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('instagram_posts','instagram_config');
select id, public from storage.buckets where id = 'instagram-media';
```

Expected: both tables listed; bucket row with `public = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260702120000_instagram_feed.sql
git commit -m "feat: add instagram_posts, instagram_config tables and storage bucket"
```

---

### Task 2: Pure sync helpers (TDD)

**Files:**
- Create: `supabase/functions/sync-instagram/lib.ts`
- Test: `supabase/functions/sync-instagram/lib_test.ts`

> **Prerequisite:** the Deno runtime must be available (`deno --version`). The Supabase CLI bundles Deno; standalone Deno also works. All tests run with `deno test`.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/sync-instagram/lib_test.ts`:

```ts
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  storageKey,
  imageSourceUrl,
  mediaToRow,
  selectRetained,
  needsRefresh,
} from "./lib.ts";

Deno.test("storageKey builds deterministic jpg key", () => {
  assertEquals(storageKey("123"), "123.jpg");
});

Deno.test("imageSourceUrl uses thumbnail for VIDEO", () => {
  assertEquals(
    imageSourceUrl({ id: "1", media_type: "VIDEO", thumbnail_url: "t", media_url: "m", permalink: "p", timestamp: "2020" }),
    "t",
  );
});

Deno.test("imageSourceUrl uses media_url for IMAGE", () => {
  assertEquals(
    imageSourceUrl({ id: "1", media_type: "IMAGE", media_url: "m", permalink: "p", timestamp: "2020" }),
    "m",
  );
});

Deno.test("imageSourceUrl returns null when no url", () => {
  assertEquals(
    imageSourceUrl({ id: "1", media_type: "IMAGE", permalink: "p", timestamp: "2020" }),
    null,
  );
});

Deno.test("mediaToRow maps fields and nulls missing caption", () => {
  const row = mediaToRow({ id: "9", media_type: "IMAGE", media_url: "m", permalink: "http://p", timestamp: "2021-01-01T00:00:00Z" });
  assertEquals(row.ig_media_id, "9");
  assertEquals(row.caption, null);
  assertEquals(row.storage_path, "9.jpg");
  assertEquals(row.permalink, "http://p");
  assertEquals(row.media_type, "IMAGE");
  assertEquals(row.timestamp, "2021-01-01T00:00:00Z");
});

Deno.test("selectRetained keeps latest `cap` by timestamp desc", () => {
  const items = [
    { id: "a", timestamp: "2021-01-01" },
    { id: "b", timestamp: "2022-01-01" },
    { id: "c", timestamp: "2020-01-01" },
  ];
  assertEquals(selectRetained(items, 2).keep, ["b", "a"]);
});

Deno.test("selectRetained keeps all when fewer than cap", () => {
  const items = [{ id: "a", timestamp: "2021-01-01" }];
  assertEquals(selectRetained(items, 50).keep, ["a"]);
});

Deno.test("needsRefresh true when within threshold", () => {
  assertEquals(needsRefresh("2026-07-05T00:00:00Z", new Date("2026-07-02T00:00:00Z"), 10), true);
});

Deno.test("needsRefresh false when far from expiry", () => {
  assertEquals(needsRefresh("2026-09-01T00:00:00Z", new Date("2026-07-02T00:00:00Z"), 10), false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno test supabase/functions/sync-instagram/lib_test.ts`
Expected: FAIL — `Module not found "./lib.ts"` (implementation doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/sync-instagram/lib.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `deno test supabase/functions/sync-instagram/lib_test.ts`
Expected: PASS — all 9 tests ok.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/sync-instagram/lib.ts supabase/functions/sync-instagram/lib_test.ts
git commit -m "feat: add tested pure helpers for instagram sync"
```

---

### Task 3: Edge Function orchestration

**Files:**
- Create: `supabase/functions/sync-instagram/index.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Register the function in config.toml**

Append to `supabase/config.toml`:

```toml
[functions.sync-instagram]
verify_jwt = false
```

- [ ] **Step 2: Write the function**

Create `supabase/functions/sync-instagram/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  IgMedia,
  imageSourceUrl,
  mediaToRow,
  needsRefresh,
  selectRetained,
  storageKey,
} from "./lib.ts";

const BUCKET = "instagram-media";
const RETENTION_CAP = 50;
const MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

serve(async (req) => {
  // Shared-secret gate so only our cron (or us) can trigger a sync.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1. Load the single config row.
    const { data: config, error: cfgErr } = await supabase
      .from("instagram_config").select("*").eq("id", 1).single();
    if (cfgErr || !config) throw new Error("instagram_config row missing (id=1)");

    let accessToken: string = config.access_token;

    // 2. Refresh the token if it's close to expiry (non-fatal on failure).
    if (needsRefresh(config.token_expires_at, new Date())) {
      const refreshRes = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
      );
      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.access_token) {
        accessToken = refreshData.access_token;
        const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
        await supabase.from("instagram_config")
          .update({ access_token: accessToken, token_expires_at: expiresAt })
          .eq("id", 1);
      } else {
        console.error("Token refresh failed:", refreshData);
      }
    }

    // 3. Fetch the latest posts.
    const mediaRes = await fetch(
      `https://graph.instagram.com/me/media?fields=${MEDIA_FIELDS}&limit=${RETENTION_CAP}&access_token=${accessToken}`,
    );
    const mediaJson = await mediaRes.json();
    if (!mediaRes.ok) throw new Error("Media fetch failed: " + JSON.stringify(mediaJson));
    const media: IgMedia[] = mediaJson.data ?? [];

    // 4. Cache images (skip-if-exists) and upsert rows.
    const { data: existingFiles } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
    const existingKeys = new Set((existingFiles ?? []).map((f) => f.name));

    for (const m of media) {
      const key = storageKey(m.id);
      if (!existingKeys.has(key)) {
        const src = imageSourceUrl(m);
        if (!src) { console.warn("No image url for", m.id); continue; }
        const imgRes = await fetch(src);
        if (!imgRes.ok) { console.warn("Image download failed for", m.id); continue; }
        const bytes = new Uint8Array(await imgRes.arrayBuffer());
        const up = await supabase.storage.from(BUCKET)
          .upload(key, bytes, { contentType: "image/jpeg", upsert: true });
        if (up.error) { console.warn("Upload failed for", m.id, up.error.message); continue; }
      }
      const { error: upsertErr } = await supabase.from("instagram_posts")
        .upsert(mediaToRow(m), { onConflict: "ig_media_id" });
      if (upsertErr) console.warn("Upsert failed for", m.id, upsertErr.message);
    }

    // 5. Reconcile: delete rows + images no longer in the latest set.
    const { keep } = selectRetained(
      media.map((m) => ({ id: m.id, timestamp: m.timestamp })),
      RETENTION_CAP,
    );
    const keepSet = new Set(keep);
    const { data: allRows } = await supabase.from("instagram_posts")
      .select("ig_media_id, storage_path");
    const toDelete = (allRows ?? []).filter((r) => !keepSet.has(r.ig_media_id));
    if (toDelete.length) {
      await supabase.storage.from(BUCKET).remove(toDelete.map((r) => r.storage_path));
      await supabase.from("instagram_posts").delete()
        .in("ig_media_id", toDelete.map((r) => r.ig_media_id));
    }

    return new Response(
      JSON.stringify({ synced: media.length, deleted: toDelete.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-instagram error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
```

- [ ] **Step 3: Type-check the function**

Run: `deno check supabase/functions/sync-instagram/index.ts`
Expected: no type errors (imports resolve, no missing symbols).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/sync-instagram/index.ts supabase/config.toml
git commit -m "feat: add sync-instagram edge function"
```

> **Live verification of this function happens in Task 5**, after deploy + Meta setup (Task 6).

---

### Task 4: Frontend — render from Supabase

**Files:**
- Modify: `src/integrations/supabase/types.ts`
- Modify: `src/components/Portfolio.tsx`

- [ ] **Step 1: Add the `InstagramPost` type**

Append to `src/integrations/supabase/types.ts` (after the existing `Testimonial` type):

```ts
export type InstagramPost = {
  id: string
  ig_media_id: string
  permalink: string
  caption: string | null
  media_type: string
  storage_path: string
  dominant_color: string | null
  timestamp: string
  is_hidden: boolean
  created_at: string
}
```

- [ ] **Step 2: Rewrite `Portfolio.tsx` to query Supabase**

Replace the entire contents of `src/components/Portfolio.tsx`:

```tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { InstagramPost } from "@/integrations/supabase/types";

const DISPLAY_COUNT = 12;
const BUCKET = "instagram-media";

const Portfolio = () => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);

  useEffect(() => {
    supabase
      .from("instagram_posts")
      .select("*")
      .eq("is_hidden", false)
      .order("timestamp", { ascending: false })
      .limit(DISPLAY_COUNT)
      .then(({ data }) => {
        if (data) setPosts(data as InstagramPost[]);
      });
  }, []);

  if (posts.length === 0) return null;

  return (
    <section id="portfolio" className="section-padding bg-beige">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-heading text-charcoal text-center mb-16">פרויקטים נבחרים</h2>

        <div className="mx-auto flex max-w-[800px] flex-col gap-5">
          {posts.map((post) => {
            const { data: { publicUrl } } = supabase.storage
              .from(BUCKET)
              .getPublicUrl(post.storage_path);
            return (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square w-full overflow-hidden bg-charcoal/5"
                style={post.dominant_color ? { backgroundColor: `rgb(${post.dominant_color})` } : undefined}
              >
                <img
                  src={publicUrl}
                  alt={post.caption?.slice(0, 100) || "GY Interior Design"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-500 group-hover:bg-black/50 group-hover:opacity-100">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                    <path d="M17.5 6.5h .01" />
                  </svg>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
```

- [ ] **Step 3: Type-check / build the frontend**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Verify render behavior with seed data**

Because live data needs Task 6, verify the query path now by inserting one temporary row (SQL Editor), then loading the site:

```sql
-- Temporary smoke row (delete after checking).
insert into public.instagram_posts (ig_media_id, permalink, caption, media_type, storage_path, timestamp)
values ('smoke-1', 'https://instagram.com/p/smoke', 'smoke test', 'IMAGE', 'smoke-1.jpg', now());
```

Run: `npm run dev` and open `http://localhost:8080/#portfolio`.
Expected: the portfolio section renders one tile (image will be broken since no Storage object exists — that's fine; we're verifying the query + layout). Then clean up:

```sql
delete from public.instagram_posts where ig_media_id = 'smoke-1';
```

- [ ] **Step 5: Commit**

```bash
git add src/integrations/supabase/types.ts src/components/Portfolio.tsx
git commit -m "feat: render portfolio from instagram_posts table"
```

---

### Task 5: Deploy + schedule the daily sync

**Files:**
- Create: `supabase/migrations/20260702130000_instagram_cron.sql`

> **Prerequisite:** Task 6 (Meta setup) done — `instagram_config` row exists with a valid token. `CRON_SECRET` set (see Task 6).

- [ ] **Step 1: Deploy the function**

Run: `supabase functions deploy sync-instagram`
Expected: deploy succeeds; function appears in the dashboard.

- [ ] **Step 2: Trigger one manual sync and inspect output**

Run (replace `<CRON_SECRET>` with the value set in Task 6):

```bash
curl -s -X POST \
  -H "x-cron-secret: <CRON_SECRET>" \
  https://gokoxjavfixchaedxdvm.supabase.co/functions/v1/sync-instagram
```

Expected: JSON like `{"synced": <n>, "deleted": <m>}` with `synced` > 0.

- [ ] **Step 3: Verify data + images landed**

SQL Editor:

```sql
select count(*) from public.instagram_posts;
select name from storage.objects where bucket_id = 'instagram-media' limit 5;
```

Expected: row count > 0; Storage objects named `<id>.jpg`.

- [ ] **Step 4: Confirm idempotency**

Re-run the Step 2 curl. Expected: succeeds again; Storage object count does NOT increase (skip-if-exists working).

- [ ] **Step 5: Write the schedule migration**

Create `supabase/migrations/20260702130000_instagram_cron.sql` (replace `<CRON_SECRET>` with the real value before running — it lives server-side in the DB):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-instagram-daily',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://gokoxjavfixchaedxdvm.supabase.co/functions/v1/sync-instagram',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 6: Apply the schedule and verify**

Apply the migration (SQL Editor). Verify:

```sql
select jobname, schedule from cron.job where jobname = 'sync-instagram-daily';
```

Expected: one row, schedule `0 4 * * *`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260702130000_instagram_cron.sql
git commit -m "feat: schedule daily instagram sync via pg_cron"
```

---

### Task 6: Meta one-time setup guide (manual, user-run)

**Files:**
- Create: `docs/instagram-meta-setup.md`

- [ ] **Step 1: Write the setup guide**

Create `docs/instagram-meta-setup.md`:

```markdown
# Instagram Feed — One-Time Setup

This connects the GY Instagram business account to the site's sync function.
Do this once. It takes ~15 minutes.

## 1. Create a Meta app
1. Go to https://developers.facebook.com/apps → "Create App".
2. Choose use case **"Other"** → app type **"Business"**.
3. Name it (e.g. "GY Site Feed") and create.

## 2. Add Instagram (Instagram Login)
1. In the app dashboard → "Add product" → **Instagram** → "Set up".
2. Open **API setup with Instagram business login**.
3. Under "Generate access tokens", click **Add account** and log in with the
   GY Instagram business account; authorize the `instagram_business_basic` scope.
4. Click **Generate token** and copy the token. Copy the numeric **Instagram user id** shown too.

## 3. Exchange for a long-lived (60-day) token
The generated token may be short-lived. Exchange it (find the app secret under
App settings → Basic → App secret):

    curl -s "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<APP_SECRET>&access_token=<SHORT_LIVED_TOKEN>"

The response is `{ "access_token": "...", "token_type": "bearer", "expires_in": 5183944 }`.
Copy the long-lived `access_token`.

## 4. Store the token in Supabase
Supabase Dashboard → SQL Editor:

    insert into public.instagram_config (id, ig_user_id, access_token, token_expires_at)
    values (1, '<IG_USER_ID>', '<LONG_LIVED_TOKEN>', now() + interval '60 days')
    on conflict (id) do update
      set ig_user_id = excluded.ig_user_id,
          access_token = excluded.access_token,
          token_expires_at = excluded.token_expires_at;

## 5. Set the function's cron secret
Pick any random string as CRON_SECRET, then:

    supabase secrets set CRON_SECRET=<CRON_SECRET>

Use this same value in the Task 5 curl and the cron migration.

## 6. First sync
Deploy the function (`supabase functions deploy sync-instagram`) and run the
manual curl from the plan's Task 5, Step 2. Your posts should appear on the site.

## Maintenance
- The daily sync auto-refreshes the token before it expires — no action needed
  as long as the sync keeps running.
- If the site is idle for >60 days and the token lapses, redo steps 2–4.
- To hide a post: set `is_hidden = true` for its row in `instagram_posts`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/instagram-meta-setup.md
git commit -m "docs: add instagram meta setup guide"
```

---

## Self-review notes

- **Spec coverage:** Graph API pull (Task 3), download-to-Storage with deterministic keys + skip-if-exists (Task 3 Step 2), token auto-refresh (Task 3), reconcile/retention cap 50 (Task 3 Step 2 + tested Task 2), display 12 (Task 4), `is_hidden` replaces exclude-list (Tasks 1 & 4), daily schedule (Task 5), manual Meta setup no app review (Task 6), RLS/server-side token (Task 1), error handling keeps cache on failure (Task 3 try/catch + per-post `continue`). All covered.
- **Deviation from spec:** `dominant_color` is stored nullable but NOT computed in v1 (Graph API doesn't provide it and decoding images in Deno to compute it is out of scope — YAGNI). The column exists; the grid falls back to a neutral `bg-charcoal/5` placeholder. Raising this later is additive.
- **Type consistency:** `IgMedia`/`PostRow` in `lib.ts` are used unchanged in `index.ts`; `InstagramPost` (frontend) matches the `instagram_posts` columns from Task 1.
```
