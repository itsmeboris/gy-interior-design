import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige">
      <div className="text-center space-y-4">
        <h1 className="text-display text-charcoal">404</h1>
        <p className="text-body text-muted-foreground">הדף לא נמצא</p>
        <Link to="/" className="btn-primary inline-block">
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
