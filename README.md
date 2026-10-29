# Sketchbook

A creative playground built with Next.js App Router, React, TypeScript, and p5.js. Create visually with shape tools or write JavaScript in a live editor.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page with the animated ribbon study and **Start interactively** / **Open code editor** calls to action. |
| `/interactove` | Blank interactive canvas with shape insertion, Reset, and PNG export. The existing route spelling is intentional for compatibility. |
| `/ide` | JavaScript editor with syntax highlighting, isolated live preview, console, examples, and code download. |

The Sketchbook logo returns to the landing page. Header links switch between editing modes.

## Interactive mode

The canvas starts empty, without the ribbon animation. Select a tool under **Insert shape**, then click or tap the canvas:

- **Pointer:** inspect coordinates; clicks log a `p5.Vector` in the browser console.
- **Triangle:** place three vertices.
- **Rectangle:** place the top-left and bottom-right corners.
- **Ellipse:** place the center, then a corner of its bounding box to set horizontal and vertical radii.

Completed shapes remain on the canvas. Point counters guide insertion; changing tools cancels an unfinished shape. **Reset** clears all shapes and pending points. **Save PNG** downloads the current canvas as `my-sketch.png`.

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

Interactive canvases and editor drafts autosave to browser `localStorage` on this device. Each mode keeps its own named sketches. Use **Change sketch** to switch, create, rename, or delete. The two modes do not share sketches with each other, and nothing is uploaded to a server.

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
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

No database, authentication, or API keys are required for these modes.

## Project structure

- `app/page.tsx`: landing and entry-point CTAs.
- `app/interactove/page.tsx`: interactive drawing workspace.
- `app/ide/page.tsx`: code editor route.
- `components/workspace-header.tsx`: shared navigation.
- `components/sketch-playground.tsx`: browser-only p5 loading, controls, and cleanup.
- `lib/sketch.ts`: landing animation and interactive drawing mode.
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
