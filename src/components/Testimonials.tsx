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
          <p className="text-body text-charcoal/80 italic mb-8 leading-relaxed whitespace-pre-wrap">
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
