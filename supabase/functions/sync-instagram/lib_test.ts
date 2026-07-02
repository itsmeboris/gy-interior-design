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
