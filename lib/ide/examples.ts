export const ribbonExample = `p.setup = () => {
  p.createCanvas(800, 640);
  p.pixelDensity(1);
  p.noFill();
};

p.draw = () => {
  p.background('#fafafa');
  p.translate(p.width / 2, p.height / 2);
  const time = p.frameCount * 0.008;
  const bend = (p.mouseX / p.width - 0.5) * 0.3;

  for (let i = 0; i < 55; i++) {
    const t = i / 54;
    p.stroke(p.lerpColor(
      p.color('#365edb'), p.color('#d52368'), t
    ));
    p.strokeWeight(1.2);
    p.beginShape();
    for (let a = 0; a <= p.TWO_PI; a += 0.025) {
      const r = 170 + t * 50 + p.sin(a * 3 + t * 4 + time) * 30;
      const twist = t * 2.5 + bend;
      const x = p.cos(a) * r;
      const y = p.sin(a) * r * (0.72 + 0.24 * p.cos(t * 4));
      p.vertex(
        x * p.cos(twist) - y * p.sin(twist),
        x * p.sin(twist) + y * p.cos(twist)
      );
    }
    p.endShape(p.CLOSE);
  }
};

p.mouseClicked = () => {
  helpers.logMouseCoordinates(p);
};
`

export const triangleExample = `const capture = helpers.createTriangleCapture();
const shapes = [];

p.setup = () => {
  const canvas = p.createCanvas(800, 640);
  canvas.mouseClicked(() => {
    const point = helpers.logMouseCoordinates(p);
    if (!point) return;
    const shape = capture.addPoint(point);
    if (shape) shapes.push(shape);
  });
  console.log('Click three points to create a triangle.');
};

p.draw = () => {
  p.background('#fafafa');
  const gradient = helpers.createLinearGradient(
    p, p.createVector(0, 0), p.createVector(800, 640),
    [
      { offset: 0, color: '#365edb' },
      { offset: 1, color: '#d52368' }
    ]
  );
  p.noStroke();
  helpers.applyGradientFill(p, gradient);
  shapes.forEach(shape => helpers.drawTriangle(p, shape));

  p.fill('#d52368');
  capture.points.forEach(point => p.circle(point.x, point.y, 10));
  helpers.showMouseCoordinates(p, '#252630', '#fafafa');
};
`
