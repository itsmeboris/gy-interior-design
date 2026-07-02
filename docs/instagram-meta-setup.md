# Instagram Feed — Your Setup Guide

This is everything **you** need to do by hand to connect the GY Instagram business
account to the site. I'm building all the code in parallel — you can start this now.
Takes ~15 minutes. Do it once.

When you finish, send me back the **4 values** marked 🔑 below and I'll wire in the rest.

---

## Before you start — have these ready
- Login to the **GY Instagram business account**.
- Access to the linked **Facebook account** (Meta developer login).
- Access to the **Supabase project** dashboard (project `gokoxjavfixchaedxdvm`).

---

## Step 1 — Create a Meta app
1. Go to https://developers.facebook.com/apps → **Create App**.
2. **App details**: name it e.g. `GY Site Feed` → Next.
3. **Use cases** (this is the "Add use cases" screen): select
   **"Manage messaging & content on Instagram"** (the Instagram-icon card:
   *"Publish posts … with the Instagram API"*). This is the use case that exposes
   the Instagram API with Instagram Login + the `instagram_business_basic`
   permission we need. Do NOT pick the oEmbed / "Embed content in other websites"
   option. → Next.
4. Continue through **Business** → **Requirements** → **Overview** and create the app.

## Step 2 — Set up Instagram login + generate a token
1. In the app dashboard left menu, open **Instagram** → **API setup with Instagram
   business login**.
2. Under **Generate access tokens** → **Add account**, log in with the GY
   Instagram business account and authorize the requested permission
   (`instagram_business_basic`).
3. Click **Generate token**. Copy it somewhere safe.
   - 🔑 **(A) Instagram user id** — the numeric id shown next to the account.
   - This first token may be short-lived (1 hour) — we upgrade it in Step 3.

## Step 3 — Upgrade to a 60-day token
1. Get your **App secret**: app dashboard → **App settings → Basic → App secret** (Show).
2. Run this (replace the two placeholders). You can paste it into any terminal, or
   ask me and I'll run it for you:

   ```bash
   curl -s "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<APP_SECRET>&access_token=<TOKEN_FROM_STEP_2>"
   ```
3. Response looks like:
   ```json
   { "access_token": "IGA...long...", "token_type": "bearer", "expires_in": 5183944 }
   ```
   - 🔑 **(B) long-lived access_token** — the `access_token` value.
   - 🔑 **(C) expires_in** — the number (seconds; ~5,184,000 = 60 days).

## Step 4 — Pick a cron secret
Make up any random string (e.g. a password-manager generated one).
- 🔑 **(D) CRON_SECRET** — this random string.

---

## What to send me
Just these 4:
- 🔑 (A) Instagram user id
- 🔑 (B) long-lived access token
- 🔑 (C) expires_in seconds
- 🔑 (D) your chosen CRON_SECRET

⚠️ The token and CRON_SECRET are **secrets** — the token grants read access to your
account's media. Prefer sending them through a private channel. I'll store them only
in Supabase (server-side, RLS-locked), never in the website code.

---

## What I do with them (for transparency)
- Store (A)(B)(C) in the `instagram_config` table (locked; not public):
  ```sql
  insert into public.instagram_config (id, ig_user_id, access_token, token_expires_at)
  values (1, '<A>', '<B>', now() + interval '60 days')
  on conflict (id) do update set
    ig_user_id = excluded.ig_user_id,
    access_token = excluded.access_token,
    token_expires_at = excluded.token_expires_at;
  ```
- Set (D) as the function secret: `supabase secrets set CRON_SECRET=<D>`.
- Deploy the function and run the first sync — your posts appear on the site.

## After it's live
- The daily sync **auto-refreshes** the token, so it won't expire while the site runs.
- To **hide a post**, flip `is_hidden = true` on its row in `instagram_posts` (I can
  do this, or show you how in the dashboard).
- If the feed ever sits unused for 60+ days and the token lapses, we just redo
  Steps 2–4.

---

## Supabase access — how the DB/function steps get applied

Three things happen on the Supabase side. Some I can do from code, some need you:

| Action | Who / how |
|---|---|
| Create tables + Storage bucket (schema SQL) | **You**, paste the SQL into Dashboard → SQL Editor → Run. (Or grant me linked CLI + DB password and I run `supabase db push`.) |
| Insert token into `instagram_config` | **You** (keeps the secret off my side), or I run it if you share the token privately. |
| Deploy the function (`supabase functions deploy`) | Needs the **Supabase CLI logged in** (`supabase login` + `supabase link`). If you've done that locally I can run it; otherwise you run the one command. |
| Set `CRON_SECRET` (`supabase secrets set`) | Same as deploy — CLI-authenticated. |

**What I need from you to keep moving:**
1. Confirm you can access the **SQL Editor** in the Supabase dashboard (for schema + token insert), **or** tell me the Supabase CLI is already logged in on this machine.
2. If the CLI is **not** logged in and you want me to deploy, run `! supabase login` in this session (the `!` prefix runs it here so I can continue).

I can write and commit all the code without any Supabase access — access is only needed for the **apply/deploy/first-sync** steps (plan Tasks 1, 5, 6).

## If you get stuck
- Can't find "API setup with Instagram business login" → make sure the app type is
  **Business** and you added the **Instagram** product.
- "Invalid platform app" / token errors on exchange → double-check the App secret and
  that you're using `graph.instagram.com` (not `graph.facebook.com`).
- Send me the exact error text and I'll help.
