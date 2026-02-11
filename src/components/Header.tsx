import { FileText } from "lucide-react";

const Header = () => (
  <header className="text-center mb-10">
    <div className="flex items-center justify-center gap-3 mb-3">
      <FileText className="h-8 w-8 text-primary" />
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
        Make Your ATS Resume Human-Readable
      </h1>
    </div>
    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
      Turn plain markdown resumes into beautiful, readable layouts.
    </p>
  </header>
);

export default Header;
