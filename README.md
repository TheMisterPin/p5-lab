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

`/interactove` remains the visual-editor route. Desktop editing fills the viewport; the canvas fits the available stage and the inspector and object list scroll independently. Mobile uses a stacked workspace.

### Creation

| Tool | Shortcut | Creation |
| --- | --- | --- |
| Triangle | 1 | Drag an upright triangle, or click three vertices. |
| Rectangle | 2 | Drag bounds, or click opposite corners. |
| Ellipse | 3 | Drag bounds, or click center and radius extent. |
| Circle | 4 | Drag constrained bounds, or click center and a point on its radius. |
| Square | 5 | Drag or click constrained opposite corners. |
| Quad | 6 | Click four vertices in authored order. |
| Line | 7 | Drag endpoints or click two endpoints. |
| Connected dots | 8 | Click vertices or drag the next segment endpoint. Enter, double-click, or Finish completes it; Escape cancels. |

Connected dots requires two distinct points. Double-click does not add a duplicate final vertex. Holding and dragging places one endpoint on release, without freehand sampling. The Add centered control provides keyboard creation for fixed-size shapes.

### Selection, geometry, and objects

Use V to select, W to move, E to rotate, R to scale, and T for triangle/quad vertex editing. Shift snaps rotation to 15° or constrains scaling. Arrow keys nudge by one canvas pixel; Shift + arrows nudges by ten. Ctrl/Command + D duplicates; Delete removes an unlocked selection. Undo/redo uses Ctrl/Command + Z and Ctrl/Command + Shift + Z (or Ctrl + Y).

The inspector edits the name, center position, local dimensions, rotation, and Scale X/Y percentages. **100% refers to base geometry**, and dimensions are derived from base geometry and scale. Circle and Square always use uniform scale. The proportional lock is optional for other shapes. Scaling changes geometry without scaling stroke or dot sizes.

Vertex inputs use canvas coordinates. Editing triangle or quad vertices preserves scale percentages and rotation; bounds/pivot are recentered while untouched vertices stay fixed in canvas space. Degenerate polygons remain editable. A zero base extent has a disabled dimension field; vertex editing can expand it again.

Objects are listed front to back. Duplicate creates an independent ID and an unlocked copy offset by 16 pixels. Arrange controls change drawing order. Hidden objects are omitted from artwork exports but remain in projects. Locked objects are skipped by canvas selection and remain selectable through Objects; geometry and deletion are disabled while naming, appearance, visibility, ordering, and duplication remain available.

### Appearance and canvas

New closed shapes use a solid light fill and dark stroke. Each object has fill/none, stroke/none, stroke weight, and opacity. Open objects use stroke settings only. Connected-dot diameter is the greater of 6 canvas pixels and 2.5 times stroke weight; disabling stroke hides both segments and dots. Opacity multiplies paint alpha.

Canvas background and dimensions are editable. Resizing clips or reveals artwork without moving objects. Dimensions are whole pixels, up to 8192 per axis and 16,777,216 total pixels.

Valid continuous edits preview immediately and commit as a single undo operation when the interaction ends. History retains the last 100 changes per canvas while the visual editor remains mounted, including canvas settings, appearance, ordering, names, and flags. It does not survive reload or leaving the editor. Escape/pointer cancellation discards unfinished gestures.

### Projects and artwork exports

- **Download Project** saves a versioned `.p5lab.json` file with the canvas, names, IDs, base geometry, transforms, appearance, order, visibility, and locks.
- **Import Project** validates the complete file and opens it as a new named visual sketch; existing sketches are preserved. Supported projects use `format: "p5-lab-project"`, envelope version 1, and scene version 2. Imports are limited to 10 MB, 5000 objects, and 100,000 total vertices.
- **Save PNG** includes only the artwork, without selection overlays.
- **Download JS** produces standalone p5.js instance-mode JavaScript.
- **Open in code editor** creates and activates a new code sketch, preserving previous code sketches. It is a one-way copy: code changes do not update the visual scene. Failed storage writes keep the visual editor open and leave download actions available.

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

Visual canvases and editor drafts autosave to browser `localStorage`. Each mode keeps named sketches through Change sketch; nothing is uploaded. Both original shape arrays and version-1 visual scenes migrate to version 2 without changing geometry or drawing order. Migrated objects retain the original canvas-space gradient, colours, stroke, and fill alpha. This remains an explicit Legacy gradient fill until changed to solid or none; canvas resizing does not silently reposition its gradient endpoints. Existing storage keys and the store envelope are unchanged. Save errors are reported while editing continues in memory.

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

`pnpm test` bundles the focused TypeScript tests with the existing esbuild dependency and runs Node's test runner. It covers migration/storage roundtrips, constraints, transformed vertex editing, project validation, object management, hit-testing, history, and equivalence between generated code and visual drawing calls. Builds require Google Fonts access for the existing Geist fonts.

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
