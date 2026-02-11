import { useEffect, useState, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { extractDomains, fetchBrands, type BrandData } from "@/lib/brandfetch";

interface ResumePreviewProps {
  markdown: string;
}

/**
 * Post-process the resume container to inject brand logos and accent borders
 * for any element whose text contains a detected domain.
 */
function applyBrandEnrichment(
  container: HTMLElement,
  brands: Map<string, BrandData>
) {
  // Walk through all text-containing elements
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const enriched = new Set<HTMLElement>();

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.toLowerCase() ?? "";
    const parent = node.parentElement;
    if (!parent || enriched.has(parent)) continue;

    for (const [domain, brand] of brands) {
      if (!text.includes(domain)) continue;
      if (!brand.logoUrl && !brand.accentColor) continue;

      // Find the closest block-level ancestor to decorate
      const block = parent.closest("p, li, h3, div") as HTMLElement | null;
      if (!block || enriched.has(block)) continue;
      enriched.add(block);

      block.classList.add("brand-enriched");

      if (brand.accentColor) {
        block.style.borderLeft = `3px solid ${brand.accentColor}`;
        block.style.paddingLeft = "12px";
      }

      if (brand.logoUrl) {
        // Avoid duplicate logos
        if (block.querySelector(".brand-logo")) continue;
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
  const previewRef = useRef<HTMLDivElement>(null);

  // Convert markdown to HTML
  useEffect(() => {
    const convert = async () => {
      const raw = await marked(markdown);
      setHtml(DOMPurify.sanitize(raw));
    };
    convert();
  }, [markdown]);

  // Fetch brand data for detected domains
  useEffect(() => {
    const domains = extractDomains(markdown);
    if (domains.length === 0) return;

    let cancelled = false;
    fetchBrands(domains).then((result) => {
      if (!cancelled) setBrands(result);
    });
    return () => { cancelled = true; };
  }, [markdown]);

  // Apply brand enrichment to rendered HTML
  useEffect(() => {
    if (!previewRef.current || brands.size === 0) return;
    // Small delay to ensure HTML is rendered
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
