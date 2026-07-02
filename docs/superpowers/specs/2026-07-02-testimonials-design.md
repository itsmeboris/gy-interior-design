# המלצות (Testimonials) Section — Design Spec

**Date:** 2026-07-02

## Overview

Add a testimonials section ("המלצות") to the GY Interior Design site, appearing between the Portfolio and Contact sections. Content is managed via Supabase so testimonials can be added, edited, or hidden without any code changes or redeployment.

## Layout & UX

- **Style:** Carousel — one testimonial displayed at a time, centered on the page
- **Navigation:** Dot indicators below the quote; clicking a dot jumps to that testimonial. No auto-advance.
- **Visual design:** Large gold `"` quotation mark, italic quote text, thin gold horizontal rule, then client name (bold) and project detail (muted, smaller). Matches existing site aesthetic: `bg-beige`, `section-padding`, `container-gy`, `text-charcoal`, gold accents.
- **RTL:** Full right-to-left layout, consistent with the rest of the site.

## Data Model — Supabase table `testimonials`

| column   | type    | notes                              |
|----------|---------|------------------------------------|
| `id`     | int8 PK | auto-increment                     |
| `quote`  | text    | the recommendation text            |
| `name`   | text    | client name                        |
| `detail` | text    | e.g. "עיצוב דירה, תל אביב"        |
| `order`  | int2    | controls display order             |
| `active` | boolean | false = hidden without deleting    |

**RLS policy:** Public `SELECT` on `active = true` rows. No auth required to read.

Content is managed directly in the Supabase dashboard table editor.

## Files to Create / Modify

| file | change |
|------|--------|
| `src/components/Testimonials.tsx` | new component |
| `src/integrations/supabase/types.ts` | add `Testimonial` type |
| `src/pages/Index.tsx` | insert `<Testimonials />` between `<Portfolio />` and `<Contact />` |
| `src/components/Navbar.tsx` | add `{ href: "#testimonials", label: "המלצות" }` before צור קשר |

## Component Behaviour

- Fetches `testimonials` rows where `active = true`, ordered by `order asc` on mount
- Shows a subtle loading state (empty section) while fetching; no spinner needed
- If fetch returns 0 rows, the section renders nothing (no empty state shown to visitors)
- Carousel state managed with `useState` (current index)
- Prev/next driven by dot clicks only (no swipe required for v1)

## Out of Scope

- Admin UI — content managed via Supabase dashboard
- Swipe / touch gestures
- Star ratings
- Animations between slides (plain swap is fine for v1)
