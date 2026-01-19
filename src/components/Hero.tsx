import heroImage from "@/assets/hero-dining.jpg";
import { TextLogo } from "./Navbar";

const Hero = () => {
  return <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img src={heroImage} alt="עיצוב פנים מינימליסטי" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-charcoal/20" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-start pt-32 md:pt-40 text-center px-6">
        <TextLogo size="large" />
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce-slow">
        <div className="flex flex-col items-center gap-2">
          <span className="text-warm-white text-xs tracking-widest">גלול למטה</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-warm-white">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>;
};
export default Hero;