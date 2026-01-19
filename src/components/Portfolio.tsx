import { useEffect } from "react";

const Portfolio = () => {
  useEffect(() => {
    // Load Behold script
    const script = document.createElement("script");
    script.src = "https://w.behold.so/widget.js";
    script.type = "module";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://w.behold.so/widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <section id="portfolio" className="section-padding bg-beige">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-heading text-charcoal text-center mb-16">פרויקטים נבחרים</h2>
        
        <div className="behold-widget-container w-full">
          <behold-widget feed-id="6FX31AQUrODCLDv5JDdh"></behold-widget>
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
