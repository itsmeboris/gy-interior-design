import { TextLogo } from "./Navbar";

const Footer = () => {
  return (
    <footer className="footer-bg py-8">
      <div className="container-gy">
        <div className="flex flex-col items-center justify-center gap-4">
          <TextLogo />
          <p className="text-small text-charcoal/60">
            Copyright © 2025 GY Interior Design
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;