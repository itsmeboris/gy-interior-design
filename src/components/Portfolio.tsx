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
