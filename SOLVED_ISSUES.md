# Solved Issues & Bug Fixes

This document tracks identified bugs, root causes, and solutions for future reference.

---

## 1. Canvas Vertical Stretch on Zoom > Screen Width (e.g., 250%)

- **Date Resolved**: 2026-11-12
- **Affected Component**: [`src/components/PDFPreviewer.tsx`](file:///e:/Personal%20Project/Honmyou/Web%20App/Print%20Template%20Renderer/src/components/PDFPreviewer.tsx)
- **Severity**: High (Visual layout corruption during high zoom levels)

### Symptom
When zooming into a document beyond the viewport width (e.g. 200% - 250%+), the rendered pages did not scale uniformly. Instead, the page stretched vertically while remaining clamped horizontally, causing severe distortion of text and graphics.

### Root Cause
1. **CSS Width Constrained**: The `<canvas>` elements inside `PDFPreviewer.tsx` had Tailwind classes `max-w-full h-auto`. 
2. When the zoom level scaled the canvas's pixel dimensions larger than the preview container:
   - `max-w-full` forced the canvas width to remain bounded by the container's visible width.
   - The inline styles dynamically assigned by the rendering effect (`canvas.style.height = ...`) set an explicit pixel height based on the scaled viewport.
   - Because `max-w-full` capped the width while height expanded to its full scaled value, the aspect ratio was broken and the canvas stretched vertically.
3. The parent wrapper container also had `w-full`, which prevented the scrollable container (`overflow-auto`) from properly measuring a content width wider than the viewport to trigger horizontal scrolling.

### Fix
In [`src/components/PDFPreviewer.tsx`](file:///e:/Personal%20Project/Honmyou/Web%20App/Print%20Template%20Renderer/src/components/PDFPreviewer.tsx):

1. **Remove `max-w-full h-auto` from `<canvas>`**:
   ```diff
   - <canvas className="block max-w-full h-auto" />
   + <canvas className="block" />
   ```
   Both width and height are precisely managed by `viewport.width / pixelRatio` and `viewport.height / pixelRatio` in the render effect, maintaining exact 1:1 aspect ratio at any scale.

2. **Allow wrapper to fit natural content width**:
   ```diff
   - className={`w-full flex ${ ... }`}
   + className={`min-w-fit flex ${ ... }`}
   ```
   This allows the parent `div.overflow-auto` viewport to properly enable bidirectional (horizontal & vertical) scrolling when pages exceed the viewport bounds at zoom levels like 250% or 300%.

### Verification
- Ran `npm run build` and verified successful compilation without TypeScript or bundler errors.
- Verified that high zoom levels maintain proportional scaling and enable natural horizontal scrolling.
