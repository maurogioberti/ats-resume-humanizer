# ATS Resume Humanizer

Convert AI-readable (ATS) Markdown resumes into clean, human-readable
branded PDF resumes.

This project was built during a 2-hour hackathon using **Lovable
(AI-assisted development)** and the **Brandfetch API**.\
You can explore the commit history to see the AI-generated work and
subsequent manual refinements and stabilization.

The goal was simple:

> Turn plain Markdown resumes into visually enriched, printable
> documents with branding.

## 🚀 Features

-   Markdown file upload
-   Regex-based domain detection
-   Brand logo enrichment via Brandfetch API
-   Accent color styling per brand
-   In-browser PDF export (print to PDF)
-   Client-side caching to reduce API calls
-   Graceful fallback if API rate limit is exceeded

## 🛠 Tech Stack

-   React
-   Vite
-   TypeScript
-   Brandfetch API
-   Lovable (AI-assisted coding)
-   Bun / Node.js

## Requirements

- Node.js 18+ (Node 20 recommended)
- Bun 1.0+ (optional)

## ⚙️ Setup

1.  Clone the repository:

```
git clone https://github.com/maurogioberti/ats-resume-humanizer.git
cd ats-resume-humanizer
```

2.  Create a `.env` file in the root directory:

```
VITE_BRANDFETCH_API_KEY=your_brandfetch_api_key_here
```

### Option 1 — Using Bun

3.  Install dependencies:

```
bun install
```

4.  Start development server:

```
bun run dev
```

### Option 2 — Using Node (npm)

3.  Install dependencies:

```
npm install
```

4.  Start development server:

```
npm run dev
```

## 🧠 How It Works

-   Extracts domains from Markdown using regex
-   Deduplicates domains before API calls
-   Fetches branding data from Brandfetch
-   Applies logo and accent styling dynamically
-   Falls back safely if API fails or rate limits

## 🎯 Hackathon Context

This project was developed under time constraints during a live
hackathon.\
The repository includes:

-   AI-generated commits via Lovable
-   Manual post-hackathon refinements
-   Stabilization and visual polishing

## 📄 License

MIT