// Brandfetch API integration for domain brand enrichment

const API_KEY = import.meta.env.VITE_BRANDFETCH_API_KEY as string | undefined;
const API_BASE = "https://api.brandfetch.io/v2/brands";

export interface BrandData {
  domain: string;
  companyName?: string;
  logoUrl: string | null;
  accentColor: string | null;
  qualityScore: number;
}

export interface CompanyEntry {
  companyName: string;
  domain: string;
  headingText: string;
}

interface BrandFetchLogo {
  type: string;
  formats: { src: string; format: string }[];
}

interface BrandFetchColor {
  type: string;
  hex: string;
}

interface BrandFetchResponse {
  logos?: BrandFetchLogo[];
  colors?: BrandFetchColor[];
  qualityScore?: number;
}

const brandCache = new Map<string, BrandData>();

function pickLogo(logos: BrandFetchLogo[]): string | null {
  const preferred = logos.find((l) => l.type === "logo") ?? logos.find((l) => l.type === "icon") ?? logos[0];
  if (!preferred?.formats?.length) return null;
  const svg = preferred.formats.find((f) => f.format === "svg");
  return svg?.src ?? preferred.formats[0]?.src ?? null;
}

function pickAccentColor(colors: BrandFetchColor[]): string | null {
  const accent = colors.find((c) => c.type === "accent");
  return accent?.hex ?? colors[0]?.hex ?? null;
}

async function fetchBrand(domain: string, companyName?: string): Promise<BrandData> {
  const fallback: BrandData = { domain, companyName, logoUrl: null, accentColor: null, qualityScore: 0 };

  if (!API_KEY) {
    console.warn("Brandfetch API key not configured");
    return fallback;
  }

  try {
    const res = await fetch(`${API_BASE}/${domain}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (res.status === 404) return fallback;
    if (res.status === 401) { console.warn("Invalid Brandfetch API key"); return fallback; }
    if (res.status === 429) { console.warn("Brandfetch quota exceeded"); return fallback; }
    if (!res.ok) return fallback;

    const data: BrandFetchResponse = await res.json();
    return {
      domain,
      companyName,
      logoUrl: pickLogo(data.logos ?? []),
      accentColor: pickAccentColor(data.colors ?? []),
      qualityScore: data.qualityScore ?? 0,
    };
  } catch {
    return fallback;
  }
}

/** Extract company name from a heading like "Company Name – Role Title" */
function extractCompanyName(heading: string): string {
  // Take text before "–" or "-" (em dash or en dash or hyphen with spaces)
  let name = heading.split(/\s[–—-]\s/)[0].trim();
  // If contains "/", take first part
  if (name.includes("/")) {
    name = name.split("/")[0].trim();
  }
  // Remove anything inside parentheses
  name = name.replace(/\([^)]*\)/g, "").trim();
  return name;
}

/** Generate a probable domain from a company name */
function companyToDomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    + ".com";
}

/** Extract companies from the Work Experience section of markdown */
export function extractCompanies(markdown: string): CompanyEntry[] {
  const lines = markdown.split("\n");
  let inWorkExperience = false;
  const companies: CompanyEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect Work Experience section (h2 level)
    if (/^##\s+(work\s+experience|experience|professional\s+experience)/i.test(trimmed)) {
      inWorkExperience = true;
      continue;
    }

    // Exit when hitting another h2 section
    if (inWorkExperience && /^##\s+/.test(trimmed) && !/^###/.test(trimmed)) {
      inWorkExperience = false;
      continue;
    }

    // Inside Work Experience, look for h3 headings (company entries)
    if (inWorkExperience && /^###\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^###\s+/, "");
      const companyName = extractCompanyName(headingText);
      if (companyName && !seen.has(companyName.toLowerCase())) {
        seen.add(companyName.toLowerCase());
        companies.push({
          companyName,
          domain: companyToDomain(companyName),
          headingText,
        });
      }
    }
  }

  return companies;
}

/** Extract unique domains from raw markdown text (legacy) */
export function extractDomains(markdown: string): string[] {
  const matches = markdown.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g);
  if (!matches) return [];
  const ignore = new Set(["e.g", "i.e", "etc.com"]);
  const unique = new Set<string>();
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!ignore.has(lower) && lower.includes(".")) unique.add(lower);
  }
  return Array.from(unique);
}

/** Fetch brand data for multiple domains with caching */
export async function fetchBrands(entries: { domain: string; companyName?: string }[]): Promise<Map<string, BrandData>> {
  const results = new Map<string, BrandData>();
  const toFetch: { domain: string; companyName?: string }[] = [];

  for (const e of entries) {
    if (brandCache.has(e.domain)) {
      results.set(e.domain, brandCache.get(e.domain)!);
    } else {
      toFetch.push(e);
    }
  }

  const fetched = await Promise.allSettled(toFetch.map((e) => fetchBrand(e.domain, e.companyName)));

  fetched.forEach((result, i) => {
    const { domain, companyName } = toFetch[i];
    const data = result.status === "fulfilled" ? result.value : { domain, companyName, logoUrl: null, accentColor: null, qualityScore: 0 };
    brandCache.set(domain, data);
    results.set(domain, data);
  });

  return results;
}
