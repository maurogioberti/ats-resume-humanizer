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
 * Enrich inline domains inside li, p, and span elements with lightweight branding.
 */
function enrichInlineDomains(
  container: HTMLElement,
  brands: Map<string, BrandData>
) {
  const targetElements = container.querySelectorAll("li, p, span");
  for (const element of targetElements) {
    // Process text nodes inside the element
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const nodesToReplace: Array<{ node: Text; matches: RegExpExecArray[] }> = [];
    let currentNode: Text | null;

    while ((currentNode = walker.nextNode() as Text | null)) {
      // Skip if already inside an inline-brand wrapper
      if (currentNode.parentElement?.classList.contains("inline-brand")) {
        continue;
      }

      const text = currentNode.textContent ?? "";
      const matches: RegExpExecArray[] = [];
      const regex = /([a-zA-Z0-9-]+\.(com|ai|org|net|io|co|dev|com\.ar))/gi;
      let match;

      while ((match = regex.exec(text))) {
        matches.push(match);
      }

      if (matches.length > 0) {
        nodesToReplace.push({ node: currentNode, matches });
      }
    }

    // Replace matched domains with enriched spans
    for (const { node, matches } of nodesToReplace) {
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();

      for (const match of matches) {
        const domainText = match[1];
        const matchIndex = match.index ?? 0;
        const domainKey = normalizeDomain(domainText);

        if (!domainKey) continue;

        const brand = brands.get(domainKey);
        if (!brand || !brand.logoUrl) continue;

        // Add text before match
        if (matchIndex > lastIndex) {
          fragment.appendChild(
            document.createTextNode(node.textContent!.slice(lastIndex, matchIndex))
          );
        }

        // Create inline brand wrapper
        const inlineBrand = document.createElement("span");
        inlineBrand.className = "inline-brand";
        if (brand.logoTheme === "light") {
          inlineBrand.classList.add("inline-brand--dark");
        }

        // Add logo
        const img = document.createElement("img");
        img.src = brand.logoUrl;
        img.alt = `${brand.name ?? domainKey} logo`;
        img.className = "inline-brand-logo";
        inlineBrand.appendChild(img);

        // Add domain text
        const text = document.createElement("span");
        text.className = "inline-brand-text";
        text.textContent = domainText;
        inlineBrand.appendChild(text);

        fragment.appendChild(inlineBrand);
        lastIndex = matchIndex + domainText.length;
      }

      // Add remaining text
      if (lastIndex < (node.textContent ?? "").length) {
        fragment.appendChild(
          document.createTextNode(node.textContent!.slice(lastIndex))
        );
      }

      node.parentNode?.replaceChild(fragment, node);
    }
  }
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

  enrichInlineDomains(container, brands);
}

const ResumePreview = ({ markdown }: ResumePreviewProps) => {
  const [html, setHtml] = useState("");
  const [brands, setBrands] = useState<Map<string, BrandData>>(new Map());
  const [isEnriching, setIsEnriching] = useState(false);
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

    if (allDomains.size === 0) {
      setIsEnriching(false);
      return;
    }

    setIsEnriching(true);
    let cancelled = false;
    fetchBrands(Array.from(allDomains)).then((result) => {
      if (!cancelled) setBrands(result);
      if (!cancelled) setIsEnriching(false);
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
    <section className="mt-10 relative">
      <div className="flex justify-end mb-3 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Download as PDF
        </Button>
      </div>

      {isEnriching && (
        <div className="resume-loading-overlay">
          <div className="spinner"></div>
          <p className="mt-3 text-sm text-muted-foreground">
            Enriching brands...
          </p>
        </div>
      )}

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
