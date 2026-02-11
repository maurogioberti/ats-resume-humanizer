// Brandfetch API integration for domain brand enrichment

const API_KEY = import.meta.env.VITE_BRANDFETCH_API_KEY as string | undefined;
const API_BASE = "https://api.brandfetch.io/v2/brands";

export interface BrandData {
  domain: string;
  logoUrl: string | null;
  accentColor: string | null;
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
}

const brandCache = new Map<string, BrandData>();

function pickLogo(logos: BrandFetchLogo[]): string | null {
  // Prefer type === "logo", fallback to "icon"
  const preferred = logos.find((l) => l.type === "logo") ?? logos.find((l) => l.type === "icon") ?? logos[0];
  if (!preferred?.formats?.length) return null;
  // Prefer SVG
  const svg = preferred.formats.find((f) => f.format === "svg");
  return svg?.src ?? preferred.formats[0]?.src ?? null;
}

function pickAccentColor(colors: BrandFetchColor[]): string | null {
  const accent = colors.find((c) => c.type === "accent");
  return accent?.hex ?? colors[0]?.hex ?? null;
}

async function fetchBrand(domain: string): Promise<BrandData> {
  const fallback: BrandData = { domain, logoUrl: null, accentColor: null };

  if (!API_KEY) {
    console.warn("Brandfetch API key not configured");
    return fallback;
  }

  try {
    const res = await fetch(`${API_BASE}/${domain}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (res.status === 404) return fallback;
    if (res.status === 401) {
      console.warn("Invalid Brandfetch API key");
      return fallback;
    }
    if (res.status === 429) {
      console.warn("Brandfetch quota exceeded");
      return fallback;
    }
    if (!res.ok) return fallback;

    const data: BrandFetchResponse = await res.json();
    return {
      domain,
      logoUrl: pickLogo(data.logos ?? []),
      accentColor: pickAccentColor(data.colors ?? []),
    };
  } catch {
    return fallback;
  }
}

/** Extract unique domains from raw markdown text */
export function extractDomains(markdown: string): string[] {
  const matches = markdown.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g);
  if (!matches) return [];

  // Filter out common non-domain patterns and deduplicate
  const ignore = new Set(["e.g", "i.e", "etc.com"]);
  const unique = new Set<string>();
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!ignore.has(lower) && lower.includes(".")) {
      unique.add(lower);
    }
  }
  return Array.from(unique);
}

/** Fetch brand data for multiple domains with caching */
export async function fetchBrands(domains: string[]): Promise<Map<string, BrandData>> {
  const results = new Map<string, BrandData>();
  const toFetch: string[] = [];

  for (const d of domains) {
    if (brandCache.has(d)) {
      results.set(d, brandCache.get(d)!);
    } else {
      toFetch.push(d);
    }
  }

  const fetched = await Promise.allSettled(toFetch.map((d) => fetchBrand(d)));

  fetched.forEach((result, i) => {
    const domain = toFetch[i];
    const data = result.status === "fulfilled" ? result.value : { domain, logoUrl: null, accentColor: null };
    brandCache.set(domain, data);
    results.set(domain, data);
  });

  return results;
}
