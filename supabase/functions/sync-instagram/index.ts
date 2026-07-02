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
