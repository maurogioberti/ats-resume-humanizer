import { useEffect, useState, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { extractCompanies, extractDomains, fetchBrands, type BrandData } from "@/lib/brandfetch";

interface ResumePreviewProps {
  markdown: string;
}

/**
 * Post-process the resume container to enrich elements
 * with brand logos, accent borders, and verified badges.
 */
function applyBrandEnrichment(
  container: HTMLElement,
  brands: Map<string, BrandData>,
  companyHeadings: Map<string, string> // domain -> headingText
) {
  // Enrich h3 headings from Work Experience
  const h3s = container.querySelectorAll("h3");
  for (const h3 of h3s) {
    const text = h3.textContent ?? "";

    for (const [domain, headingText] of companyHeadings) {
      // Match by domain appearing in text or by company name
      const companyPart = headingText.split(/\s[–—-]\s/)[0].trim();
      if (!text.includes(companyPart) && !text.toLowerCase().includes(domain)) continue;

      const brand = brands.get(domain);
      if (!brand || (!brand.logoUrl && !brand.accentColor)) continue;
      if (h3.querySelector(".brand-logo")) continue;

      h3.classList.add("brand-enriched");

      if (brand.accentColor) {
        h3.style.borderLeft = `3px solid ${brand.accentColor}`;
        h3.style.paddingLeft = "12px";
      }

      if (brand.logoUrl) {
        const img = document.createElement("img");
        img.src = brand.logoUrl;
        img.alt = `${brand.companyName ?? domain} logo`;
        img.className = "brand-logo";
        h3.insertBefore(img, h3.firstChild);
      }

      if (brand.qualityScore > 0.66) {
        const badge = document.createElement("span");
        badge.className = "brand-verified-badge";
        badge.textContent = "✓ Verified";
        h3.appendChild(badge);
      }

      break;
    }
  }

  // Enrich inline domain mentions (bullet points, paragraphs)
  const enriched = new Set<HTMLElement>();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.toLowerCase() ?? "";
    const parent = node.parentElement;
    if (!parent || parent.tagName === "H3") continue; // skip already-handled h3s

    for (const [domain, brand] of brands) {
      if (!text.includes(domain)) continue;
      if (!brand.logoUrl && !brand.accentColor) continue;

      const block = parent.closest("p, li, div") as HTMLElement | null;
      if (!block || enriched.has(block)) continue;
      enriched.add(block);

      block.classList.add("brand-enriched");
      if (brand.accentColor) {
        block.style.borderLeft = `3px solid ${brand.accentColor}`;
        block.style.paddingLeft = "12px";
      }
      if (brand.logoUrl && !block.querySelector(".brand-logo")) {
        const img = document.createElement("img");
        img.src = brand.logoUrl;
        img.alt = `${domain} logo`;
        img.className = "brand-logo";
        block.insertBefore(img, block.firstChild);
      }
    }
  }
}

const ResumePreview = ({ markdown }: ResumePreviewProps) => {
  const [html, setHtml] = useState("");
  const [brands, setBrands] = useState<Map<string, BrandData>>(new Map());
  const [companyHeadings, setCompanyHeadings] = useState<Map<string, string>>(new Map());
  const previewRef = useRef<HTMLDivElement>(null);

  // Convert markdown to HTML
  useEffect(() => {
    const convert = async () => {
      const raw = await marked(markdown);
      setHtml(DOMPurify.sanitize(raw));
    };
    convert();
  }, [markdown]);

  // Extract companies + inline domains and fetch brand data
  useEffect(() => {
    const companies = extractCompanies(markdown);
    const inlineDomains = extractDomains(markdown);

    const headingsMap = new Map<string, string>();
    companies.forEach((c) => headingsMap.set(c.domain, c.headingText));
    setCompanyHeadings(headingsMap);

    // Merge company domains + inline domains (deduplicated)
    const allEntries = new Map<string, { domain: string; companyName?: string }>();
    companies.forEach((c) => allEntries.set(c.domain, { domain: c.domain, companyName: c.companyName }));
    inlineDomains.forEach((d) => { if (!allEntries.has(d)) allEntries.set(d, { domain: d }); });

    if (allEntries.size === 0) return;

    let cancelled = false;
    fetchBrands(Array.from(allEntries.values())).then((result) => {
      if (!cancelled) setBrands(result);
    });
    return () => { cancelled = true; };
  }, [markdown]);

  // Apply brand enrichment to rendered HTML
  useEffect(() => {
    if (!previewRef.current || brands.size === 0 || companyHeadings.size === 0) return;
    const timeout = setTimeout(() => {
      if (previewRef.current) {
        applyBrandEnrichment(previewRef.current, brands, companyHeadings);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [html, brands, companyHeadings]);

  return (
    <section className="mt-10">
      <div className="flex justify-end mb-3 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Download as PDF
        </Button>
      </div>
      <div
        ref={previewRef}
        id="resume-preview"
        className="resume-preview bg-card text-card-foreground rounded-lg shadow-lg p-8 md:p-12"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
};

export default ResumePreview;
