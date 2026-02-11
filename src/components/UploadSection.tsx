import { useCallback, useRef, useState } from "react";
import { Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UploadSectionProps {
  onGenerate: (content: string) => void;
}

const UploadSection = ({ onGenerate }: UploadSectionProps) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    if (!file.name.endsWith(".md")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setFileContent(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-colors cursor-pointer ${
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".md"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-center gap-4 text-center">
        {fileName ? (
          <>
            <FileUp className="h-10 w-10 text-primary" />
            <p className="text-sm font-medium text-foreground">{fileName}</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Drop your .md resume here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          </>
        )}
        <Button
          size="lg"
          disabled={!fileContent}
          onClick={(e) => {
            e.stopPropagation();
            if (fileContent) onGenerate(fileContent);
          }}
        >
          Generate Resume
        </Button>
      </div>
    </Card>
  );
};

export default UploadSection;
