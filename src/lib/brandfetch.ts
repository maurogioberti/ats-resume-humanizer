// Brandfetch API integration for domain brand enrichment

const API_KEY = import.meta.env.VITE_BRANDFETCH_API_KEY as string | undefined;
const API_BASE = "https://api.brandfetch.io/v2/brands/domain";

export interface BrandData {
  name: string;
  logoUrl: string | null;
  accentColor: string | null;
  qualityScore: number;
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
  name?: string;
  logos?: BrandFetchLogo[];
  colors?: BrandFetchColor[];
  qualityScore?: number;
}

const brandCache = new Map<string, BrandData | null>();

function pickLogo(logos: BrandFetchLogo[]): string | null {
  const preferred =
    logos.find((l) => l.type === "logo") ??
    logos.find((l) => l.type === "icon") ??
    logos[0];
  if (!preferred?.formats?.length) return null;
  const svg = preferred.formats.find((f) => f.format === "svg");
  const png = preferred.formats.find((f) => f.format === "png");
  const webp = preferred.formats.find((f) => f.format === "webp");
  return svg?.src ?? png?.src ?? webp?.src ?? preferred.formats[0]?.src ?? null;
}

function pickAccentColor(colors: BrandFetchColor[]): string | null {
  const accent = colors.find((c) => c.type === "accent");
  return accent?.hex ?? colors[0]?.hex ?? null;
}

export async function fetchBrand(domain: string): Promise<BrandData | null> {
  if (brandCache.has(domain)) return brandCache.get(domain)!;

  if (!API_KEY) {
    console.warn("Brandfetch API key not configured");
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/${domain}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (res.status === 404) {
      brandCache.set(domain, null);
      return null;
    }
    if (res.status === 401) {
      console.warn("Invalid Brandfetch API key");
      brandCache.set(domain, null);
      return null;
    }
    if (res.status === 429) {
      console.warn("Brandfetch quota exceeded");
      return null;
    }
    if (!res.ok) {
      console.warn("Brandfetch error", res.status);
      return null;
    }

    const data: BrandFetchResponse = await res.json();
    const brand: BrandData = {
      name: data.name ?? domain,
      logoUrl: pickLogo(data.logos ?? []),
      accentColor: pickAccentColor(data.colors ?? []),
      qualityScore: data.qualityScore ?? 0,
    };

    brandCache.set(domain, brand);
    return brand;
  } catch (error) {
    console.warn("Brandfetch error", error);
    return null;
  }
}

/** Extract company name from a heading like "Company Name – Role Title" */
export function extractCompanyName(heading: string): string {
  let name = heading.split(/\s[–—-]\s/)[0].trim();
  if (name.includes("/")) name = name.split("/")[0].trim();
  name = name.replace(/\([^)]*\)/g, "").trim();
  return name;
}

/** Generate a probable domain from a company name */
export function companyToDomain(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
}

/** Check if a string looks like a domain */
export function isDomain(text: string): boolean {
  return /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(text);
}

export interface CompanyEntry {
  companyName: string;
  domain: string;
  headingText: string;
}

/** Extract companies from the Work Experience section of markdown */
export function extractCompanies(markdown: string): CompanyEntry[] {
  const lines = markdown.split("\n");
  let inWorkExperience = false;
  const companies: CompanyEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^##\s+(work\s+experience|experience|professional\s+experience)/i.test(trimmed)) {
      inWorkExperience = true;
      continue;
    }

    if (inWorkExperience && /^##\s+/.test(trimmed) && !/^###/.test(trimmed)) {
      inWorkExperience = false;
      continue;
    }

    if (inWorkExperience && /^###\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^###\s+/, "");
      const companyName = extractCompanyName(headingText);

      const parts = headingText.split(/\s[–—-]\s/);
      let domain: string | null = null;
      for (const part of parts) {
        const cleaned = part.trim();
        if (isDomain(cleaned)) {
          domain = cleaned.toLowerCase();
          break;
        }
      }

      if (!domain) domain = companyToDomain(companyName);

      if (domain && !seen.has(domain)) {
        seen.add(domain);
        companies.push({ companyName, domain, headingText });
      }
    }
  }

  return companies;
}

/** Extract unique domains from raw markdown text */
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
export async function fetchBrands(domains: string[]): Promise<Map<string, BrandData | null>> {
  const results = new Map<string, BrandData | null>();
  await Promise.allSettled(
    domains.map(async (d) => {
      const brand = await fetchBrand(d);
      results.set(d, brand);
    })
  );
  return results;
}
