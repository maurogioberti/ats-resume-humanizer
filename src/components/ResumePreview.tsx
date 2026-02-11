import { useEffect, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface ResumePreviewProps {
  markdown: string;
}

const ResumePreview = ({ markdown }: ResumePreviewProps) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const convert = async () => {
      const raw = await marked(markdown);
      setHtml(DOMPurify.sanitize(raw));
    };
    convert();
  }, [markdown]);

  return (
    <section className="mt-10">
      <div className="flex justify-end mb-3 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Download as PDF
        </Button>
      </div>
      <div
        id="resume-preview"
        className="resume-preview bg-card text-card-foreground rounded-lg shadow-lg p-8 md:p-12"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
};

export default ResumePreview;
