import { useEffect, useState } from "react";

const FEED_ID = "6FX31AQUrODCLDv5JDdh";

// Posts to hide from the portfolio grid.
// Values are the Instagram post shortcodes (the part after /p/ in the URL).
const EXCLUDED_SHORTCODES = new Set([
  "DVF80D5CJNo",
  "DU4_YN-iP5D",
  "DU2o4V3CBfF",
  "DU0eB8ziGWE",
]);

interface BeholdSize {
  width: number;
  height: number;
  mediaUrl: string;
}

interface BeholdPost {
  id: string;
  permalink: string;
  caption?: string;
  prunedCaption?: string;
  mediaUrl: string;
  mediaType: string;
  sizes?: Record<"small" | "medium" | "large" | "full", BeholdSize>;
  colorPalette?: { dominant?: string };
}

const shortcodeFromPermalink = (permalink: string) =>
  permalink.replace(/\/+$/, "").split("/").pop() ?? "";

const Portfolio = () => {
  const [posts, setPosts] = useState<BeholdPost[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`https://feeds.behold.so/${FEED_ID}`)
      .then((res) => res.json())
      .then((data: { posts?: BeholdPost[] }) => {
        if (cancelled) return;

        // Show all posts except the excluded ones, keeping the feed order.
        const visible = (data.posts ?? []).filter(
          (post) => !EXCLUDED_SHORTCODES.has(shortcodeFromPermalink(post.permalink))
        );

        setPosts(visible);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="portfolio" className="section-padding bg-beige">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-heading text-charcoal text-center mb-16">פרויקטים נבחרים</h2>

        <div className="mx-auto flex max-w-[800px] flex-col gap-5">
          {posts.map((post) => {
            const imageUrl = post.sizes?.large?.mediaUrl ?? post.mediaUrl;
            const dominant = post.colorPalette?.dominant;
            return (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square w-full overflow-hidden"
                style={dominant ? { backgroundColor: `rgb(${dominant})` } : undefined}
              >
                <img
                  src={imageUrl}
                  alt={post.prunedCaption?.slice(0, 100) || "GY Interior Design"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-500 group-hover:bg-black/50 group-hover:opacity-100">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
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
