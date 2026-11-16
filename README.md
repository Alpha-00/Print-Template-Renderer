# Print Template Renderer

A client-side web application designed to dynamically fetch templates, populate them with structured JSON data, and render multi-page PDFs ready for preview, printing, or download.

---

## Core Idea

Generating reports, invoices, certificates, and printable documents often requires either rigid server-side rendering setups or fragmented tools. 

**Print Template Renderer** solves this with a lightweight, browser-first approach:
1. **Parameter-Driven**: The entire document generation process can be initiated purely via URL query parameters (`?type=...&data=...&url=...`), making it easy to integrate with other backends, workflows, or automated tools.
2. **Multi-Engine Support**: Supports three distinct template formats depending on the use case:
   - **Typst**: Modern markup-based document typesetter compiled directly in the browser via WebAssembly (`@myriaddreamin/typst.ts`).
   - **DOCX**: Standard Microsoft Word templates populated dynamically using `docxtemplater` and rendered via `docx-preview`.
   - **SVG**: Vector graphics templates for certificates, badges, or label layouts with placeholder substitution and SVG-to-PDF conversion.
3. **Seamless Third-Party Link Ingestion**: Directly accepts sharing URLs from Google Drive, Google Docs, and GitHub, automatically normalizing them into raw download/export endpoints and handling CORS limitations via proxy fallback.

---

## Basic Activities & Workflow

### 1. Rendering via URL Parameters
Pass the template type, source URL, and JSON data payload directly in the browser address bar:

```text
http://localhost:3000/?type=typst&data=[{"item":"Consulting","hours":10,"total":"$1,000"}]&config={"title":"Invoice"}
```

- If `data` is a JSON array (`[...]`), the engine automatically formats it as a styled tabular dataset.
- If `data` is a JSON object (`{...}`), fields map directly to template variables.
- Large or complex JSON can be passed with base64 encoding (`data=base64:...`).

### 2. Live Document Customization in the UI
If no parameters are provided or if adjustments are needed:
- Open the built-in side panel to edit the template URL, data payload, or document configuration (page size, orientation, primary color, title) in real time.
- Switch between template engines (**Typst**, **DOCX**, **SVG**) or load pre-configured sample presets.
- Click **Copy Shareable URL** to share the exact parameterized view with others.

### 3. PDF Preview, Navigation, and Output
- **Page Navigation**: Preview documents in continuous scroll mode, single-page view, or a multi-page thumbnail grid.
- **Viewing Tools**: Zoom in/out, fit to width, rotate pages, and switch between light/dark interface modes.
- **Exporting**: Use the built-in **Print** button for native browser printing or **Download PDF** to save the generated document locally.

---

## Running the Project

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Starts the local development server at `http://localhost:3000`.

### Production Build
```bash
npm run build
npm start
```
Compiles production assets and starts the Express server serving the web application and CORS proxy helper on `http://localhost:3000`.

---

## Parameter Reference

| Parameter | Aliases | Options / Format | Description |
|---|---|---|---|
| `type` | `format` | `typst`, `docx`, `svg` | Template engine. Auto-detected from file extension if omitted. |
| `url` | `templateUrl`, `source`, `file` | URL string | Link to external template (supports Google Drive, Google Docs, GitHub, or direct URLs). Defaults to built-in sample templates if omitted. |
| `data` | `d` | JSON string or `base64:...` | Dynamic dataset (array for tables, object for key-value tags). |
| `config` | `c` | JSON string or `base64:...` | Document settings: `pageSize`, `orientation`, `primaryColor`, `title`. |
| `inline` | - | Encoded string | Raw template source text to preview without hosting a file. |

---

## Known Fixes & Documentation

- [Solved Issues & Bug Fixes](SOLVED_ISSUES.md)

