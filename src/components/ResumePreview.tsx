import DOMPurify from 'dompurify';
import { Printer } from 'lucide-react';
import { marked } from 'marked';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { BrandData, extractCompanies, extractDomains, fetchBrands, normalizeDomain } from '@/lib/brandfetch';

interface ResumePreviewProps {
  markdown: string;
}

/**
 * Post-process the resume container to enrich elements
 * with brand logos, accent borders, and verified badges.
 */
function applyBrandEnrichment(
  container: HTMLElement,
  brands: Map<string, BrandData>
) {
  // Enrich h3 headings – logo + badge on heading, border on wrapping block
  const h3s = container.querySelectorAll("h3");
  for (const h3 of h3s) {
    const text = h3.textContent ?? "";
    const domainMatch = text.match(/([a-zA-Z0-9-]+\.(com|ai|org|net|io|co|dev|com\.ar))/i);
    if (!domainMatch) continue;

    const domainKey = normalizeDomain(domainMatch[1]);
    if (!domainKey) continue;

    const brand = brands.get(domainKey);
    if (!brand || (!brand.logoUrl && !brand.accentColor)) continue;
    if (h3.querySelector(".brand-logo")) continue;

    // Apply border to the job entry block (all siblings until next h3)
    // Wrap h3 + following content in a container div
    const wrapper = document.createElement("div");
    wrapper.className = "job-entry-block";
    if (brand.accentColor) {
      wrapper.style.borderLeft = `3px solid ${brand.accentColor}`;
      wrapper.style.paddingLeft = "12px";
    }

    // Collect h3 and its sibling elements until the next h3/h2
    const siblings: Element[] = [];
    let sibling = h3.nextElementSibling;
    while (sibling && sibling.tagName !== "H3" && sibling.tagName !== "H2") {
      siblings.push(sibling);
      sibling = sibling.nextElementSibling;
    }

    h3.parentNode?.insertBefore(wrapper, h3);
    wrapper.appendChild(h3);
    for (const s of siblings) wrapper.appendChild(s);

    // Add logo inline before heading text
    if (brand.logoUrl) {
      const img = document.createElement("img");
      img.src = brand.logoUrl;
      img.alt = `${brand.name ?? domainKey} logo`;
      img.className = "brand-logo";

      const logoWrap = document.createElement("span");
      logoWrap.className = "brand-logo-wrapper";
      if (brand.logoTheme === "light") {
        logoWrap.classList.add("brand-logo-wrapper--dark");
      }
      logoWrap.appendChild(img);
      h3.insertBefore(logoWrap, h3.firstChild);
    }

    // Add verified badge
    if (brand.qualityScore > 0.66) {
      const badge = document.createElement("span");
      badge.className = "brand-verified-badge";
      badge.textContent = "✓ Verified";
      h3.appendChild(badge);
    }
  }
}

const ResumePreview = ({ markdown }: ResumePreviewProps) => {
  const [html, setHtml] = useState("");
  const [brands, setBrands] = useState<Map<string, BrandData>>(new Map());
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

    // Merge company domains + inline domains (deduplicated)
    const allDomains = new Set<string>();
    companies.forEach((c) => {
      const normalized = normalizeDomain(c.domain);
      if (normalized) allDomains.add(normalized);
    });
    inlineDomains.forEach((d) => {
      const normalized = normalizeDomain(d);
      if (normalized) allDomains.add(normalized);
    });

    if (allDomains.size === 0) return;

    let cancelled = false;
    fetchBrands(Array.from(allDomains)).then((result) => {
      if (!cancelled) setBrands(result);
    });
    return () => { cancelled = true; };
  }, [markdown]);

  // Apply brand enrichment to rendered HTML
  useEffect(() => {
    if (!previewRef.current || brands.size === 0) return;
    const timeout = setTimeout(() => {
      if (previewRef.current) {
        applyBrandEnrichment(previewRef.current, brands);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [html, brands]);

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
