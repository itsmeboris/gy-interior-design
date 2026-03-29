# GY Interior Design

A website for GY Interior Design studio — minimalist and warm interior design.

סטודיו לעיצוב פנים מינימליסטי וחמים.

## Features

- **Hero section** with full-screen imagery
- **Services overview** — planning & design, project management, home styling
- **Portfolio gallery** showcasing completed projects
- **About section** introducing the studio and designer
- **Contact form** powered by Supabase
- **Fully responsive** layout for mobile, tablet, and desktop
- **Hebrew RTL** interface with clean typography

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite (SWC)
- **Styling:** Tailwind CSS
- **Backend:** Supabase
- **Routing:** React Router 6
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/itsmeboris/gy-interior-design.git
cd gy-interior-design
npm install
```

### Environment Setup

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  components/     # Hero, Services, Portfolio, About, Contact, Navbar, Footer
  pages/          # Index, NotFound
  integrations/   # Supabase client
  lib/            # Utilities
  assets/         # Images
```

## License

© GY Interior Studio. All rights reserved.
