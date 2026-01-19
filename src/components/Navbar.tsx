import { useState, useEffect } from "react";

const navLinks = [
  { href: "#hero", label: "בית" },
  { href: "#about", label: "אודות" },
  { href: "#services", label: "שירותים" },
  { href: "#portfolio", label: "פרויקטים" },
  { href: "#contact", label: "צור קשר" },
];

const TextLogo = ({ size = "default" }: { size?: "default" | "small" | "large" }) => {
  const monogramSize = size === "small" ? "text-2xl" : size === "large" ? "text-7xl md:text-8xl" : "text-3xl";
  const valuesSize = size === "small" ? "text-[8px]" : size === "large" ? "text-sm md:text-base" : "text-[10px]";
  const descriptorSize = size === "small" ? "text-[10px]" : size === "large" ? "text-lg md:text-xl" : "text-xs";
  const textColor = size === "large" ? "text-warm-white" : "text-charcoal";
  const gapSize = size === "large" ? "gap-2" : "gap-0.5";
  
  return (
    <div className={`flex flex-col items-center ${gapSize}`}>
      {/* Monogram */}
      <span className={`font-bodoni ${monogramSize} font-normal ${textColor}/70 tracking-tight`}>
        G<span className="font-light">/</span>Y
      </span>
      {/* Values */}
      <span className={`font-montserrat ${valuesSize} font-light ${textColor}/70 tracking-logo-values`}>
        MINIMAL.PERSONAL.TIMELESS
      </span>
      {/* Descriptor */}
      <span className={`font-playfair ${descriptorSize} italic font-normal ${textColor}/80 tracking-logo-descriptor`}>
        INTERIOR DESIGN
      </span>
    </div>
  );
};

export { TextLogo };

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "navbar-solid" : "navbar-transparent"
      }`}
    >
      <div className="container-gy">
        <div className="flex items-center justify-center h-20">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-charcoal text-sm font-medium hover:opacity-60 transition-opacity duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span
                className={`h-0.5 bg-charcoal transition-all duration-300 ${
                  isMobileMenuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`h-0.5 bg-charcoal transition-all duration-300 ${
                  isMobileMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-0.5 bg-charcoal transition-all duration-300 ${
                  isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-500 ${
            isMobileMenuOpen ? "max-h-80 pb-6" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-4 pt-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-charcoal text-lg font-medium hover:opacity-60 transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;