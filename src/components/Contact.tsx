import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: formData,
      });

      if (error) throw error;

      setSubmitStatus("success");
      setFormData({ name: "", phone: "", email: "", message: "" });
    } catch (error) {
      console.error("Error sending message:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="section-padding bg-warm-white">
      <div className="container-gy">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-heading text-charcoal text-center mb-16">צור קשר</h2>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="שם מלא"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-gy"
                  required
                />
              </div>
              <div>
                <input
                  type="tel"
                  name="phone"
                  placeholder="טלפון"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-gy"
                  required
                />
              </div>
            </div>
            
            <div>
              <input
                type="email"
                name="email"
                placeholder="אימייל"
                value={formData.email}
                onChange={handleChange}
                className="input-gy"
                required
              />
            </div>
            
            <div>
              <textarea
                name="message"
                placeholder="הודעה"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="input-gy resize-none"
                required
              />
            </div>
            
            <div className="text-center">
              <button 
                type="submit" 
                className="btn-primary disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "שולח..." : "שלח הודעה"}
              </button>
              
              {submitStatus === "success" && (
                <p className="mt-4 text-green-600">ההודעה נשלחה בהצלחה!</p>
              )}
              {submitStatus === "error" && (
                <p className="mt-4 text-red-600">שגיאה בשליחת ההודעה. נסה שוב.</p>
              )}
            </div>
          </form>
          
          {/* Contact Info */}
          <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 text-charcoal/70">
            <a
              href="mailto:gy.studio.design@gmail.com"
              className="flex items-center gap-2 hover:text-charcoal transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
              <span>gy.studio.design@gmail.com</span>
            </a>
            
            <a
              href="https://www.instagram.com/gy.interior.design"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-charcoal transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <path d="M17.5 6.5h.01" />
              </svg>
              <span>@gy.interior.design</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;