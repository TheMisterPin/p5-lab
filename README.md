# Sketchbook

A creative playground built with Next.js App Router, React, TypeScript, and p5.js. Create visually with shape tools or write JavaScript in a live editor.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page with the animated ribbon study and **Start interactively** / **Open code editor** calls to action. |
| `/interactove` | Visual editor with drag/click creation, selection, transform gizmos, inspector, history, and p5.js export. The existing route spelling is intentional for compatibility. |
| `/ide` | JavaScript editor with syntax highlighting, isolated live preview, console, examples, and code download. |

The Sketchbook logo returns to the landing page. Header links switch between editing modes.

## Visual editor

Choose **Triangle**, **Rectangle**, or **Ellipse**, then drag on the canvas to set its bounds. Dragged triangles start upright. Each completed shape is selected in Move mode. The original click-through placement also works:

- **Triangle:** place three vertices.
- **Rectangle:** place two opposite corners.
- **Ellipse:** place the center, then a corner of its bounding box to set horizontal and vertical radii.

Select a shape by clicking it or choosing it in **Objects**. Frontmost shapes take precedence where shapes overlap. The contextual toolbar offers:

- **Move (W):** drag the shape freely, or drag the red X / blue Y handles along one axis.
- **Rotate (E):** drag the ring around its center. Hold Shift to snap to 15° increments.
- **Scale (R):** drag an edge or corner. The opposite edge/corner stays anchored; Shift on a corner preserves the aspect ratio.

The inspector edits center X/Y, width, height, and clockwise rotation in degrees. **Add centered** creates a shape without pointer input. Numeric fields, the Objects list, and arrow-key nudges provide keyboard alternatives to dragging. Dimensions must be at least 1 pixel for new edits. Shapes may extend beyond the canvas; exports clip at its edges.

**Undo/Redo** records each completed drag, numeric edit, creation, deletion, or **Clear canvas** as one operation. History retains the last 100 edits per canvas for the current visual-editor session, including when switching named canvases; it does not survive leaving the visual editor or reloading. Pending placement and drag previews are not autosaved. Escape or a canceled pointer gesture discards them.

| Shortcut | Action |
| --- | --- |
| V / W / E / R | Select / Move / Rotate / Scale |
| 1 / 2 / 3 | Triangle / Rectangle / Ellipse |
| Arrow keys / Shift + arrows | Move selection 1 / 10 pixels |
| Delete or Backspace | Delete selection |
| Ctrl/Command + Z | Undo |
| Ctrl/Command + Shift + Z, Ctrl + Y | Redo |
| Escape | Cancel pending action and clear selection |

Shortcuts apply within the visual workspace and do not intercept numeric-field typing. Changing tools cancels unfinished placement. **Save PNG** exports only the artwork, without selection outlines or handles.

**Open in code editor** generates readable, standalone p5.js instance-mode JavaScript and opens it as a **new** code sketch. Every export creates a separate sketch; existing code sketches are preserved. This is a one-way copy: later code edits do not update the visual scene. **Download JS** exports the same code directly. If browser storage cannot save the new code sketch, navigation is canceled and Download JS remains available.

The drawing uses an 800 × 640 coordinate space and scales to the available screen width. It redraws on interaction rather than running the ribbon animation. The landing animation retains Pause/Play, Reset, PNG export, and reduced-motion support.

## Code editor

Use p5.js instance mode: define `p.setup`, `p.draw`, and event callbacks, and call methods on `p`.

```js
p.setup = () => {
  p.createCanvas(800, 640);
};

p.draw = () => {
  p.background('#fafafa');
  p.fill('#d52368');
  p.circle(p.mouseX, p.mouseY, 60);
};
```

- **Run sketch** or **Ctrl/Command + Enter** starts a fresh preview.
- **Stop** removes the running preview.
- The console displays sketch output and runtime errors; **Clear** clears displayed messages.
- Starter examples demonstrate animated ribbons and click-to-draw triangles.
- The download button exports `sketch.js` in instance-mode format; use it inside a p5 instance with the same `helpers` binding if needed.
- Code must be JavaScript, not TypeScript or module imports.

Project utilities are exposed as `helpers`:

- Coordinates: `getMouseCoordinates`, `showMouseCoordinates`, `logMouseCoordinates`.
- Gradients: `createLinearGradient`, `createRadialGradient`, `applyGradientFill`.
- Shapes: `createTriangleCapture`, `createRectangleCapture`, `createEllipseCapture`, and `drawTriangle`, `drawRectangle`, `drawEllipse`.

## Persistence and sandboxing

Visual canvases and editor drafts autosave to browser `localStorage` on this device. Each mode keeps its own named sketches. Use **Change sketch** to switch, create, rename, or delete. Nothing is uploaded to a server. Existing saved canvases are migrated on load without changing their sketch IDs, names, drawing order, or geometry; arbitrary triangles retain their vertices. Stable object IDs and a versioned plain-data scene drive rendering, autosave, and code generation. The existing storage keys and store envelope remain compatible. The visual editor reports failed storage writes while retaining edits in memory.

Editor code runs in an `allow-scripts` iframe without `allow-same-origin`. It cannot access the parent document or its storage. This is access isolation, not CPU isolation: infinite loops can still make the tab unresponsive. Run only code you trust. Each Run replaces the iframe to discard the previous execution context.

## Development

Use the GitHub repository or v0's shadcn CLI installation option to obtain the project for local development. Requires Node.js compatible with Next.js 16 and pnpm (the package-manager version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

The `predev` and `prebuild` scripts bundle p5.js and project helpers into `public/runtime/sketch.js` with esbuild. If runtime or helper files change while the development server is already running, rebuild that browser bundle:

```sh
pnpm bundle:sketch
```

Validation and production:

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

No database, authentication, or API keys are required for these modes.

`pnpm test` bundles the focused TypeScript tests with the existing esbuild dependency and runs Node's test runner. It covers migration/storage roundtrips, hit-testing, transform geometry, history, and equivalence between generated code and visual drawing calls. Builds require Google Fonts access for the existing Geist fonts.

## Project structure

- `app/page.tsx`: landing and entry-point CTAs.
- `app/interactove/page.tsx`: interactive drawing workspace.
- `app/ide/page.tsx`: code editor route.
- `components/workspace-header.tsx`: shared navigation.
- `components/sketch-playground.tsx`: landing playback and visual-editor entry point.
- `components/editor/`: visual workspace, pointer gestures, inspector, and browser-only p5 loading.
- `lib/editor/`: serializable scenes, migration, geometry, history, rendering, and code generation.
- `lib/sketch.ts`: landing animation and original drawing helpers.
- `components/ide/`: CodeMirror editor and preview controls.
- `lib/ide/runtime.ts`: sandbox execution and console bridge.
- `lib/ide/examples.ts`: starter JavaScript sketches.
- `lib/sketches/`: localStorage sketch stores, serialization, and types.
- `components/sketch-picker.tsx`: Change sketch dialog shared by both modes.
- `public/sketch-runner.html`: isolated preview document.
- `lib/shapes/`: typed shape capture and rendering utilities.
- `lib/styles/gradients.ts`: gradient helpers.
- `lib/utility/coordinate/mouse.ts`: coordinate helpers.

Reference: [p5.js documentation](https://p5js.org/reference/).
