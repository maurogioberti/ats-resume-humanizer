import { useState } from "react";
import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";
import ResumePreview from "@/components/ResumePreview";

const Index = () => {
  const [markdown, setMarkdown] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-[900px] mx-auto">
        <Header />
        <UploadSection onGenerate={setMarkdown} />
        {markdown && <ResumePreview markdown={markdown} />}
      </div>
    </main>
  );
};

export default Index;
