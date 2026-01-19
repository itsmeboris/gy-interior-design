const services = [
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    title: "תכנון ועיצוב",
    description: "בניית קונספט עיצובי ותכניות עבודה מלאות.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0z" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    ),
    title: "ניהול ופיקוח",
    description: "ליווי השיפוץ, עבודה מול ספקים וניהול התקציב.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    title: "הלבשת הבית",
    description: "בחירת ריהוט, טקסטיל וטאץ' סופי לאווירה מושלמת.",
  },
];

const Services = () => {
  return (
    <section id="services" className="section-padding bg-warm-white">
      <div className="container-gy">
        <h2 className="text-heading text-charcoal text-center mb-16">התהליך שלנו</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="service-card text-center"
            >
              <div className="text-charcoal/70 mb-6 flex justify-center">
                {service.icon}
              </div>
              <h3 className="text-subheading text-charcoal mb-4">{service.title}</h3>
              <p className="text-body text-charcoal/70">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;