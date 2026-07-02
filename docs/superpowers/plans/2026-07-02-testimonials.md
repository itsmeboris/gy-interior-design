# המלצות (Testimonials) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase-backed carousel testimonials section ("המלצות") between Portfolio and Contact, editable via the Supabase dashboard with no code deploys needed.

**Architecture:** A `testimonials` table in Supabase stores quotes with display order and an active flag. `Testimonials.tsx` fetches active rows on mount and renders a single-item carousel with dot navigation. The section is inserted in `Index.tsx` and linked from `Navbar.tsx`.

**Tech Stack:** React, TypeScript, Tailwind CSS, Supabase JS client (`@supabase/supabase-js`), RTL Hebrew layout.

---

### Task 1: Create the Supabase `testimonials` table

**Files:**
- Modify: `src/integrations/supabase/types.ts`

- [ ] **Step 1: Create the table in Supabase**

Go to **supabase.com → your project → Table Editor → New table**.

Set table name: `testimonials`

Add columns (disable "Enable Row Level Security" for now — we'll add it in the next step):

| Name     | Type    | Default | Nullable |
|----------|---------|---------|----------|
| `id`     | int8    | —       | no (PK)  |
| `quote`  | text    | —       | no       |
| `name`   | text    | —       | no       |
| `detail` | text    | —       | no       |
| `order`  | int2    | `0`     | no       |
| `active` | boolean | `true`  | no       |

Save the table.

- [ ] **Step 2: Enable RLS and add public read policy**

In the Supabase dashboard → **Authentication → Policies** → find the `testimonials` table → **Enable RLS**.

Then click **New Policy → Create a policy from scratch**:
- Policy name: `public read active testimonials`
- Command: `SELECT`
- Using expression: `active = true`
- No WITH CHECK expression needed

Save the policy.

- [ ] **Step 3: Insert 2–3 sample testimonials to test with**

In the Supabase dashboard → **Table Editor → testimonials → Insert row**. Add at least 2 rows, e.g.:

| quote | name | detail | order | active |
|-------|------|--------|-------|--------|
| עיצוב שמרגיש כמו בית. יגאל ויסמן ידעו בדיוק מה אנחנו צריכים ואיך להביא את זה לחיים. | דנה ואלון | עיצוב דירה, תל אביב | 1 | true |
| תהליך שיתוף פעולה מדהים מתחילה ועד סוף. הצוות הגיב מהר, הבין בדיוק מה רצינו. | מיכל כהן | עיצוב סלון ומטבח, הרצליה | 2 | true |

- [ ] **Step 4: Add the Testimonial type to `src/integrations/supabase/types.ts`**

Add this export at the bottom of the file (after the `Constants` block):

```typescript
export type Testimonial = {
  id: number
  quote: string
  name: string
  detail: string
  order: number
  active: boolean
}
```

- [ ] **Step 5: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "feat: add Testimonial type for supabase table"
```

---

### Task 2: Build the `Testimonials` component

**Files:**
- Create: `src/components/Testimonials.tsx`

- [ ] **Step 1: Create `src/components/Testimonials.tsx`**

```tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Testimonial } from "@/integrations/supabase/types";

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase
      .from("testimonials")
      .select("*")
      .eq("active", true)
      .order("order", { ascending: true })
      .then(({ data }) => {
        if (data) setTestimonials(data as Testimonial[]);
      });
  }, []);

  if (testimonials.length === 0) return null;

  const t = testimonials[current];

  return (
    <section id="testimonials" className="section-padding bg-beige">
      <div className="container-gy">
        <h2 className="text-heading text-charcoal text-center mb-16">המלצות</h2>

        <div className="max-w-2xl mx-auto text-center">
          {/* Quote mark */}
          <div
            className="text-gold font-playfair text-6xl leading-none mb-4 select-none"
            aria-hidden="true"
          >
            &ldquo;
          </div>

          {/* Quote text */}
          <p className="text-body text-charcoal/80 italic mb-8 leading-relaxed">
            {t.quote}
          </p>

          {/* Divider */}
          <div className="w-8 h-px bg-gold mx-auto mb-6" />

          {/* Name + detail */}
          <p className="text-charcoal font-medium mb-1">{t.name}</p>
          <p className="text-small text-charcoal/50">{t.detail}</p>

          {/* Dot navigation */}
          {testimonials.length > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`המלצה ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    i === current ? "bg-gold" : "bg-greige"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
```

- [ ] **Step 2: Verify the dev server compiles without errors**

Run: `npm run dev`

Expected: no TypeScript errors, dev server starts on `http://localhost:5173`. Stop with `Ctrl+C` after confirming.

- [ ] **Step 3: Commit**

```bash
git add src/components/Testimonials.tsx
git commit -m "feat: add Testimonials carousel component"
```

---

### Task 3: Wire the section into the page and navbar

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add Testimonials to `src/pages/Index.tsx`**

Replace the current content of `src/pages/Index.tsx` with:

```tsx
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Portfolio />
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  );
};

export default Index;
```

- [ ] **Step 2: Add the nav link in `src/components/Navbar.tsx`**

Find the `navLinks` array (line 3) and add the המלצות entry before the צור קשר entry:

```tsx
const navLinks = [
  { href: "#hero", label: "בית" },
  { href: "#about", label: "אודות" },
  { href: "#services", label: "שירותים" },
  { href: "#portfolio", label: "פרויקטים" },
  { href: "#testimonials", label: "המלצות" },
  { href: "#contact", label: "צור קשר" },
];
```

- [ ] **Step 3: Run the dev server and verify visually**

Run: `npm run dev`

Open `http://localhost:5173`. Confirm:
- The navbar shows "המלצות" between "פרויקטים" and "צור קשר"
- Clicking "המלצות" in the nav scrolls to the section
- The section appears between Portfolio and Contact
- The testimonials from Supabase are displayed
- Dot navigation works (clicking dots switches testimonials)
- Section renders `null` gracefully if Supabase returns no rows (test by temporarily setting all rows to `active = false` in the dashboard)

- [ ] **Step 4: Commit**

```bash
git add src/pages/Index.tsx src/components/Navbar.tsx
git commit -m "feat: wire testimonials section into page and navbar"
```

---

### Task 4: Update Vercel and deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Confirm Vercel deployment**

Vercel auto-deploys on push to main. Watch the deployment in the Vercel dashboard. Once complete, open the production URL and verify the המלצות section appears with live Supabase data.
