

# Make ATS Resume Human-Readable

A clean, single-page web app that converts Markdown resumes into beautifully styled, printable documents.

## Pages & Layout

**Single page app** with a centered container (max-width 900px) and three sections:

### 1. Header
- Title: "Make Your ATS Resume Human-Readable"
- Subtitle: "Turn plain markdown resumes into beautiful, readable layouts."
- Clean, modern typography

### 2. Upload Section
- Drag-and-drop zone with visual feedback (hover/active states)
- File input restricted to `.md` files only
- Displays the uploaded file name after selection
- "Generate Resume" primary button to trigger the conversion

### 3. Resume Preview
- Appears after clicking "Generate Resume"
- White card with soft shadow, professional typography
- Styled resume elements: large name heading, section headers with subtle borders, clean bullet points, professional link styling
- "Download as PDF" button in the top-right corner that triggers `window.print()`
- Print CSS so only the resume preview prints cleanly

## Technical Approach
- Install `marked` library for Markdown → HTML conversion
- Components: `Header`, `UploadSection`, `ResumePreview`
- Render converted HTML with `dangerouslySetInnerHTML` (with DOMPurify sanitization)
- Print-specific CSS media query to hide everything except the resume

## User Flow
1. User lands on page → sees header and upload area
2. Drags/selects a `.md` file → file name appears
3. Clicks "Generate Resume" → beautiful resume preview renders below
4. Clicks "Download as PDF" → browser print dialog opens with only the resume

