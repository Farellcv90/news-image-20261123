import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The World in One Day - Monday 23 November 2026. Newspaper drawn in code.
const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const CREAM: RGB = [250, 246, 235];
const INK: RGB = [22, 22, 22];
const NAVY: RGB = [18, 38, 80];
const RED: RGB = [198, 30, 35];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [90, 90, 90];
const TAN: RGB = [212, 182, 130];
const SEA: RGB = [184, 214, 230];
const BLUE: RGB = [40, 110, 190];
const SKY: RGB = [150, 200, 235];
const GREEN: RGB = [60, 140, 70];
const ORANGE: RGB = [240, 120, 30];
const YELLOW: RGB = [250, 200, 60];
const BROWN: RGB = [120, 80, 45];
const DARK: RGB = [45, 45, 55];
const LIGHT: RGB = [230, 225, 210];
const TEAL: RGB = [30, 140, 140];

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
}
function rectOutline(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
  fillRect(x, y, w, t, c); fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c); fillRect(x + w - t, y, t, h, c);
}
function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= r * r) setPx(x, y, c);
  }
}
function ring(cx: number, cy: number, r: number, c: RGB, t: number): void {
  for (let y = cy - r - t; y <= cy + r + t; y++) for (let x = cx - r - t; x <= cx + r + t; x++) {
    const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    if (d >= r && d <= r + t) setPx(x, y, c);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + ((x1 - x0) * s) / steps);
    const y = Math.round(y0 + ((y1 - y0) * s) / steps);
    fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
  }
}
function poly(pts: Array<[number, number]>, c: RGB): void {
  let minY = H, maxY = 0;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) setPx(x, y, c);
    }
  }
}
function tri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: RGB): void {
  poly([[x1, y1], [x2, y2], [x3, y3]], c);
}
function flame(x: number, y: number, s: number): void {
  tri(x, y, x + s, y, x + Math.floor(s / 2), y - s * 2, ORANGE);
  tri(x + Math.floor(s / 4), y, x + Math.floor((3 * s) / 4), y, x + Math.floor(s / 2), y - s, YELLOW);
  circle(x + Math.floor(s / 2), y - Math.floor(s / 2), Math.max(2, Math.floor(s / 3)), ORANGE);
}
function smoke(x: number, y: number, r: number): void {
  circle(x, y, r, [160, 160, 160]); circle(x + r, y - 3, Math.max(2, r - 2), [185, 185, 185]);
}
function person(x: number, y: number, s: number, c: RGB): void {
  circle(x, y, s, c); fillRect(x - 1, y + s, 3, s * 2, c);
  line(x - 1, y + s * 3, x - s, y + s * 5, c, 2); line(x + 1, y + s * 3, x + s, y + s * 5, c, 2);
}

// 5x7 bitmap font, uppercase.
const GLYPH: Record<string, string[]> = {
  "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  "C": [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  "G": [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  "I": [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "J": ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  "X": ["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"],
  "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.##.", "#..##"],
  "$": ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "&": [".#...", "#.#..", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
};
function glyphFor(ch: string): string[] {
  if (ch === "·" || ch === "•") return [".....", ".....", ".....", ".###.", ".###.", ".....", "....."];
  const g = GLYPH[ch.toUpperCase()];
  return g !== undefined ? g : GLYPH[" "];
}
function textW(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}
function drawText(x: number, y: number, text: string, scale: number, c: RGB, bold: boolean): void {
  let cx = x;
  for (const ch of text) {
    const g = glyphFor(ch);
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "#") {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
          if (bold) fillRect(cx + col * scale + 1, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawCentered(cx: number, y: number, text: string, scale: number, c: RGB, bold: boolean): void {
  drawText(cx - Math.floor(textW(text, scale) / 2), y, text, scale, c, bold);
}
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") cur = w;
    else if ((cur + " " + w).length <= maxChars) cur = cur + " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawWrapped(x: number, y: number, text: string, scale: number, c: RGB, bold: boolean, maxChars: number, lineH: number): number {
  const lines = wrap(text, maxChars);
  let yy = y;
  for (const ln of lines) { drawText(x, yy, ln, scale, c, bold); yy += lineH; }
  return yy;
}

// Scene painters. Each draws inside box (x,y,w,h).
function sceneGlobe(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  circle(x + Math.floor(w / 2) - 30, y + Math.floor(h / 2), 26, BLUE);
  circle(x + Math.floor(w / 2) - 38, y + Math.floor(h / 2) - 8, 10, GREEN);
  circle(x + Math.floor(w / 2) - 20, y + Math.floor(h / 2) + 10, 8, GREEN);
  fillRect(x + w - 52, y + 22, 12, 34, DARK); smoke(x + w - 46, y + 14, 7);
  line(x + Math.floor(w / 2) + 8, y + 14, x + Math.floor(w / 2) + 30, y + 40, BROWN, 4);
  fillRect(x + Math.floor(w / 2) + 24, y + 36, 18, 8, BROWN);
  line(x + Math.floor(w / 2) + 33, y + 44, x + Math.floor(w / 2) + 44, y + 56, BROWN, 3);
  fillRect(x, y + h - 8, w, 8, NAVY);
}
function sceneWarship(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + h - 18, w, 18, BLUE);
  poly([[x + 20, y + h - 22], [x + w - 20, y + h - 22], [x + w - 40, y + h - 8], [x + 40, y + h - 8]], DARK);
  fillRect(x + 60, y + h - 48, 70, 26, [70, 70, 80]);
  fillRect(x + 86, y + h - 64, 10, 16, DARK);
  flame(x + 100, y + h - 24, 10); smoke(x + 110, y + 18, 8);
  const dx = x + w - 70, dy = y + 16;
  fillRect(dx, dy, 22, 6, INK); circle(dx - 4, dy + 3, 4, INK); circle(dx + 26, dy + 3, 4, INK);
  circle(dx + 11, dy + 3, 3, RED);
  fillRect(x + 8, y + h - 26, 14, 20, BROWN); fillRect(x + w - 22, y + h - 26, 14, 20, BROWN);
}
function sceneCollapse(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [200, 205, 215]);
  poly([[x + 30, y + h - 6], [x + 44, y + 18], [x + 110, y + 12], [x + 120, y + h - 6]], [150, 145, 135]);
  poly([[x + 130, y + h - 6], [x + 150, y + 40], [x + 205, y + 34], [x + 210, y + h - 6]], [120, 115, 105]);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    fillRect(x + 56 + i * 20, y + 26 + j * 18, 10, 10, YELLOW);
  }
  poly([[x + 120, y + h - 6], [x + 150, y + h - 22], [x + 185, y + h - 6]], [100, 95, 85]);
  person(x + 240, y + h - 34, 4, ORANGE); person(x + 262, y + h - 34, 4, ORANGE);
  fillRect(x, y + h - 6, w, 6, DARK);
}
function sceneCapitol(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x + Math.floor(w / 2) - 40, y + h - 22, 80, 16, WHITE);
  circle(x + Math.floor(w / 2), y + h - 26, 22, WHITE);
  fillRect(x + Math.floor(w / 2) - 3, y + 6, 6, 14, WHITE);
  for (let i = -2; i <= 2; i++) fillRect(x + Math.floor(w / 2) + i * 14 - 2, y + h - 22, 4, 16, [200, 200, 200]);
  fillRect(x + w - 52, y + h - 30, 36, 24, BROWN);
  fillRect(x + w - 44, y + h - 34, 20, 6, INK);
  fillRect(x + w - 42, y + h - 44, 16, 10, WHITE);
}
function sceneOilRadar(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [235, 220, 190]);
  circle(x + 36, y + h - 18, 16, [180, 180, 180]); circle(x + 70, y + h - 18, 16, [160, 160, 160]);
  fillRect(x + 20, y + h - 18, 32, 12, [180, 180, 180]); fillRect(x + 54, y + h - 18, 32, 12, [160, 160, 160]);
  line(x + w - 36, y + h - 6, x + w - 36, y + 14, DARK, 3);
  line(x + w - 50, y + h - 6, x + w - 36, y + 20, DARK, 2);
  line(x + w - 22, y + h - 6, x + w - 36, y + 20, DARK, 2);
  circle(x + w - 36, y + 12, 7, DARK);
  flame(x + 44, y + h - 8, 8); smoke(x + 50, y + 16, 6);
}
function sceneChart(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, WHITE);
  rectOutline(x + 6, y + 4, w - 12, h - 8, INK, 2);
  line(x + 18, y + 12, x + 18, y + h - 12, INK, 2);
  line(x + 18, y + h - 12, x + w - 16, y + h - 12, INK, 2);
  line(x + 24, y + 14, x + 60, y + 20, BLUE, 3);
  line(x + 60, y + 20, x + 92, y + 30, BLUE, 3);
  line(x + 92, y + 30, x + w - 30, y + h - 18, RED, 4);
  tri(x + w - 30, y + h - 18, x + w - 44, y + h - 20, x + w - 36, y + h - 32, RED);
}
function sceneFactory(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [240, 225, 200]);
  fillRect(x + 24, y + h - 30, 90, 24, [170, 90, 60]);
  fillRect(x + 30, y + h - 62, 14, 32, DARK); fillRect(x + 56, y + h - 56, 14, 26, DARK);
  flame(x + 60, y + h - 8, 10); flame(x + 88, y + h - 8, 8);
  smoke(x + 40, y + 12, 7); smoke(x + 80, y + 10, 6);
  fillRect(x + 130, y + h - 22, 50, 16, [150, 150, 150]);
}
function sceneCuffsTruck(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [220, 225, 210]);
  fillRect(x + 16, y + h - 34, 70, 22, TEAL); fillRect(x + 86, y + h - 28, 34, 16, TEAL);
  circle(x + 34, y + h - 10, 8, INK); circle(x + 100, y + h - 10, 8, INK);
  flame(x + 44, y + h - 14, 7);
  ring(x + w - 52, y + 22, 10, [150, 150, 160], 4); ring(x + w - 28, y + 22, 10, [150, 150, 160], 4);
  line(x + w - 42, y + 22, x + w - 38, y + 22, DARK, 3);
}
function sceneExamRobot(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [225, 235, 245]);
  fillRect(x + 18, y + 8, 62, h - 16, WHITE); rectOutline(x + 18, y + 8, 62, h - 16, INK, 2);
  for (let i = 0; i < 4; i++) fillRect(x + 26, y + 18 + i * 10, 46, 3, [170, 170, 170]);
  line(x + 28, y + h - 16, x + 44, y + h - 24, RED, 3); line(x + 44, y + h - 24, x + 62, y + h - 16, RED, 3);
  fillRect(x + w - 58, y + 12, 38, 30, [160, 170, 190]); rectOutline(x + w - 58, y + 12, 38, 30, DARK, 2);
  circle(x + w - 48, y + 24, 4, RED); circle(x + w - 30, y + 24, 4, RED);
  fillRect(x + w - 48, y + 34, 18, 3, DARK); line(x + w - 39, y + 12, x + w - 39, y + 6, DARK, 2);
  circle(x + w - 39, y + 5, 3, RED);
}
function sceneSpace(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [15, 20, 45]);
  circle(x + Math.floor(w / 2), y + Math.floor(h / 2) + 6, 16, [200, 140, 90]);
  ring(x + Math.floor(w / 2), y + Math.floor(h / 2) + 6, 28, [140, 150, 180], 2);
  fillRect(x + Math.floor(w / 2) + 22, y + Math.floor(h / 2) - 16, 16, 8, [200, 200, 210]);
  fillRect(x + Math.floor(w / 2) + 14, y + Math.floor(h / 2) - 14, 8, 4, BLUE);
  fillRect(x + Math.floor(w / 2) + 38, y + Math.floor(h / 2) - 14, 8, 4, BLUE);
  circle(x + 22, y + 12, 2, WHITE); circle(x + w - 26, y + 16, 2, WHITE); circle(x + 40, y + h - 10, 2, WHITE);
}
function sceneCar(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [235, 225, 205]);
  fillRect(x + 12, y + h - 28, 44, 22, [190, 160, 120]); fillRect(x + w - 56, y + h - 28, 44, 22, [190, 160, 120]);
  fillRect(x + Math.floor(w / 2) - 42, y + h - 26, 84, 16, RED);
  fillRect(x + Math.floor(w / 2) - 26, y + h - 38, 52, 14, RED);
  circle(x + Math.floor(w / 2) - 24, y + h - 8, 8, INK); circle(x + Math.floor(w / 2) + 24, y + h - 8, 8, INK);
  flame(x + Math.floor(w / 2) - 6, y + h - 12, 9); smoke(x + Math.floor(w / 2), y + 12, 6);
}
function sceneFlags(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [225, 232, 245]);
  fillRect(x + Math.floor(w / 2) - 44, y + h - 18, 88, 10, BROWN);
  line(x + 34, y + h - 8, x + 34, y + 10, DARK, 3); line(x + w - 34, y + h - 8, x + w - 34, y + 10, DARK, 3);
  fillRect(x + 34, y + 10, 30, 18, RED); fillRect(x + 34, y + 16, 30, 6, BLUE);
  fillRect(x + w - 64, y + 10, 30, 18, ORANGE); fillRect(x + w - 64, y + 16, 30, 6, WHITE); fillRect(x + w - 64, y + 22, 30, 6, GREEN);
  person(x + Math.floor(w / 2) - 20, y + h - 32, 4, NAVY); person(x + Math.floor(w / 2) + 20, y + h - 32, 4, NAVY);
}
function sceneCricket(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [170, 220, 170]);
  poly([[x + 60, y + h - 8], [x + 78, y + h - 8], [x + 108, y + 10], [x + 94, y + 8]], [230, 200, 140]);
  fillRect(x + 96, y + 4, 8, 16, BROWN);
  circle(x + w - 50, y + h - 22, 11, RED);
  line(x + w - 56, y + h - 28, x + w - 44, y + h - 16, WHITE, 2);
}
function sceneShield(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x + 20, y + h - 34, 22, 34, [120, 130, 150]); fillRect(x + 48, y + h - 44, 24, 44, [100, 110, 135]);
  fillRect(x + w - 44, y + h - 38, 24, 38, [120, 130, 150]);
  poly([[x + Math.floor(w / 2), y + 6], [x + Math.floor(w / 2) - 26, y + 12], [x + Math.floor(w / 2) - 26, y + 30], [x + Math.floor(w / 2), y + 44], [x + Math.floor(w / 2) + 26, y + 30], [x + Math.floor(w / 2) + 26, y + 12]], BLUE);
  poly([[x + Math.floor(w / 2), y + 12], [x + Math.floor(w / 2) - 18, y + 16], [x + Math.floor(w / 2) - 18, y + 28], [x + Math.floor(w / 2), y + 38], [x + Math.floor(w / 2) + 18, y + 28], [x + Math.floor(w / 2) + 18, y + 16]], SKY);
  line(x + w - 20, y + 8, x + Math.floor(w / 2) + 20, y + 18, ORANGE, 3);
}
function sceneTennis(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [150, 200, 150]);
  ring(x + 52, y + 24, 16, DARK, 3);
  line(x + 62, y + 36, x + 84, y + h - 8, BROWN, 4);
  circle(x + 96, y + 16, 6, YELLOW);
  fillRect(x + w - 54, y + 12, 26, 18, YELLOW); rectOutline(x + w - 54, y + 12, 26, 18, [180, 140, 20], 2);
  fillRect(x + w - 44, y + 30, 6, 10, [180, 140, 20]); fillRect(x + w - 50, y + 40, 18, 4, BROWN);
}

type Story = { n: number; kicker: string; head: string; deck: string; draw: (x: number, y: number, w: number, h: number) => void };
const LEADS: Story[] = [
  { n: 1, kicker: "CLIMATE · COP31", head: "CLIMATE TALKS END WITHOUT A DEAL", deck: "ANTALYA SUMMIT CLOSES SUNDAY; DRAFT OMITTED FOSSIL FUELS", draw: sceneGlobe },
  { n: 2, kicker: "AFRICA · LIBYA", head: "WARSHIP HIT AT BENGHAZI PORT", deck: "SUSPECTED DRONE ATTACK SUNDAY, OFFICIALS SAY; FIRE REPORTED", draw: sceneWarship },
  { n: 3, kicker: "EUROPE · UKRAINE", head: "DRONE COLLAPSES KYIV-REGION BLOCK", deck: "DYMER STRIKE SUNDAY; 14 MISSING, ZELENSKIY SAYS", draw: sceneCollapse },
];
const FEAT: Story[] = [
  { n: 4, kicker: "AMERICAS · USA", head: "DEMOCRATS WIN BIGGEST HOUSE MAJORITY", deck: "258 SEATS AFTER NORTH CAROLINA FLIP; LARGEST SINCE 1992", draw: sceneCapitol },
  { n: 5, kicker: "MIDDLE EAST · GULF", head: "IRAN STRIKES BAHRAIN SITE", deck: "INDUSTRIAL SITE HIT SUNDAY; GULF STATES CONDEMN ATTACK", draw: sceneOilRadar },
  { n: 6, kicker: "MARKETS · WORLD", head: "STOCKS SLIDE AS AI SELL-OFF DEEPENS", deck: "S AND P FALLS 3.7 PERCENT; NIKKEI LOSES 5.06 PERCENT", draw: sceneChart },
  { n: 7, kicker: "ASIA · INDONESIA", head: "FACTORY FIRE LEAVES DOZENS MISSING", deck: "BANTEN CANDY PLANT BLAZE SATURDAY; SEARCH CONTINUES MONDAY", draw: sceneFactory },
  { n: 8, kicker: "AMERICAS · MEXICO", head: "MEXICO CAPTURES CARTEL BOSS CHAPO ISIDRO", deck: "FBI TOP-10 FUGITIVE TAKEN SATURDAY; 11 KILLED", draw: sceneCuffsTruck },
  { n: 9, kicker: "ASIA · SOUTH KOREA", head: "MINISTER QUITS OVER AI EXAM SCANDAL", deck: "CHOI KYO-JIN RESIGNS SUNDAY OVER CHEATING MEASURES", draw: sceneExamRobot },
  { n: 10, kicker: "SCIENCE · SPACE", head: "PROBE ENTERS ORBIT AROUND MERCURY", deck: "BEPICOLOMBO ARRIVES AFTER EIGHT-YEAR JOURNEY", draw: sceneSpace },
  { n: 11, kicker: "MIDDLE EAST · WEST BANK", head: "SETTLERS TORCH VEHICLES IN VILLAGES", deck: "FOUR VILLAGES HIT OVERNIGHT; ISRAEL OPENS INQUIRY", draw: sceneCar },
  { n: 12, kicker: "ASIA · DIPLOMACY", head: "NEPAL PM HOLDS TALKS WITH MODI", deck: "BALENDRA SHAH IN NEW DELHI MONDAY; TIES REVIEWED", draw: sceneFlags },
  { n: 13, kicker: "SPORT · CRICKET", head: "INDIA POST RECORD TOTAL IN WELLINGTON", deck: "INDIA 720 FOR 9 DECLARED AGAINST NEW ZEALAND", draw: sceneCricket },
  { n: 14, kicker: "MIDDLE EAST · SAUDI", head: "SAUDI INTERCEPTS HOUTHI MISSILE", deck: "BALLISTIC MISSILE DESTROYED OVER WESTERN REGION", draw: sceneShield },
  { n: 15, kicker: "SPORT · TENNIS", head: "ALCARAZ WINS FIRST ATP FINALS TITLE", deck: "BEATS ZVEREV IN TURIN FINAL SUNDAY", draw: sceneTennis },
];
const ALSO: string[] = [
  "16. THOUSANDS MARCH IN LISBON OVER COSTS",
  "17. MYANMAR CALLS ASEAN DECISION UNFAIR",
  "18. DRONES HIT KHARTOUM HOMES, UN BUILDING",
  "19. US ARMY TO DETONATE IOWA EXPLOSIVES",
  "20. US SEEKS ANSWERS ON NVIDIA CHIPS",
  "21. FBI CRIMINAL DATABASE REPORTEDLY HACKED",
  "22. UN AI WEAPONS TALKS END WITHOUT BAN",
  "23. CRISPR THERAPY CUTS CHOLESTEROL 52%",
  "24. BOLSONARO STABLE IN INTENSIVE CARE",
  "25. ARGENTINA APPROVES $50BN LNG PROJECT",
  "26. IRAN BEGINS RATIONING ELECTRICITY",
  "27. LIVERPOOL THRASH TEN-MAN MAN UNITED",
  "28. FIFA TO CONFIRM UK 2035 WORLD CUP",
  "29. FERRARI BOSS SLAMS DRIVERS CLASH",
  "30. PRICE WINS GRAND SLAM OF DARTS",
  "31. THITIKUL WINS LPGA FINALE AGAIN",
  "32. SKUBAL REPORTEDLY AGREES METS DEAL",
  "33. SPAIN HEADS TO 29 NOVEMBER ELECTION",
  "34. HONG KONG HOLDS ELECTION COMMITTEE VOTE",
  "35. MONGOLIA FACES SNAP PRESIDENTIAL VOTE",
];

// Simplified world map continents as polygons in map-box coords (0..100, 0..60).
function drawMap(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SEA);
  const sx = (u: number): number => x + Math.round((u * w) / 100);
  const sy = (v: number): number => y + Math.round((v * h) / 60);
  const P = (arr: Array<[number, number]>): Array<[number, number]> => arr.map((p) => [sx(p[0]), sy(p[1])] as [number, number]);
  poly(P([[2, 12], [12, 6], [26, 8], [28, 16], [24, 24], [20, 28], [16, 34], [12, 30], [6, 24], [2, 18]]), TAN); // N America
  poly(P([[17, 36], [24, 36], [27, 44], [24, 55], [20, 57], [18, 46]]), TAN); // S America
  poly(P([[45, 10], [55, 8], [58, 14], [54, 18], [48, 16], [44, 14]]), TAN); // Europe
  poly(P([[44, 20], [56, 20], [60, 28], [58, 40], [53, 48], [48, 44], [45, 32]]), TAN); // Africa
  poly(P([[58, 8], [78, 6], [90, 10], [92, 18], [86, 24], [82, 32], [76, 38], [70, 30], [62, 26], [58, 18]]), TAN); // Asia
  poly(P([[80, 42], [90, 42], [92, 50], [84, 54], [80, 50]]), TAN); // Australia
  poly(P([[93, 50], [96, 52], [95, 56], [93, 54]]), TAN); // NZ
  // Numbered dots 1-15: [u,v]
  const dots: Array<[number, number]> = [
    [53, 18], [49, 25], [57, 12], [23, 18], [63, 23], [26, 20], [78, 36], [16, 27],
    [86, 20], [36, 5], [57, 22], [70, 26], [95, 54], [60, 27], [49, 14],
  ];
  for (let i = 0; i < dots.length; i++) {
    const cx = sx(dots[i][0]), cy = sy(dots[i][1]);
    circle(cx, cy, 9, RED);
    const label = String(i + 1);
    drawText(cx - Math.floor(textW(label, 1) / 2), cy - 3, label, 1, WHITE, true);
  }
}

function drawStoryCell(s: Story, x: number, y: number, w: number, sceneH: number, headScale: number, headChars: number, deckChars: number): void {
  s.draw(x, y, w, sceneH);
  rectOutline(x, y, w, sceneH, INK, 2);
  let yy = y + sceneH + 6;
  // Number badge + kicker (pill widens for two-digit numbers)
  const badgeW = s.n >= 10 ? 22 : 16;
  fillRect(x, yy, badgeW, 12, RED);
  circle(x, yy + 6, 6, RED); circle(x + badgeW, yy + 6, 6, RED);
  drawText(x + Math.floor(badgeW / 2) - Math.floor(textW(String(s.n), 1) / 2), yy + 3, String(s.n), 1, WHITE, true);
  drawText(x + badgeW + 8, yy + 3, s.kicker, 1, RED, true);
  yy += 13;
  yy = drawWrapped(x, yy, s.head, headScale, INK, true, headChars, headScale * 7 + 4);
  yy += 2;
  drawWrapped(x, yy, s.deck, 1, GREY, false, deckChars, 9);
}

function render(): void {
  fillRect(0, 0, W, H, CREAM);
  const M = 28;
  // Masthead
  fillRect(0, 0, W, 115, NAVY);
  drawText(M, 12, "THE WORLD IN ONE DAY", 2, WHITE, true);
  const right = "35 STORIES · 6 CONTINENTS · ONE DAY";
  drawText(W - M - textW(right, 1), 16, right, 1, WHITE, false);
  drawCentered(Math.floor(W / 2), 42, "MONDAY 23 NOVEMBER 2026", 6, WHITE, true);
  fillRect(0, 115, W, 4, RED);

  // Leads
  const leadY = 127;
  const leadW = Math.floor((W - M * 2 - 16) / 3);
  for (let i = 0; i < LEADS.length; i++) {
    const x = M + i * (leadW + 8);
    drawStoryCell(LEADS[i], x, leadY, leadW, 82, 2, 26, 52);
    if (i < 2) fillRect(x + leadW + 3, leadY, 2, 205, [200, 195, 180]);
  }
  fillRect(M, 338, W - M * 2, 2, INK);

  // Featured grid 4x3
  const gridY = 348;
  const cellW = Math.floor((W - M * 2 - 24) / 4);
  const cellH = 148;
  for (let i = 0; i < FEAT.length; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const x = M + col * (cellW + 8);
    const y = gridY + row * cellH;
    drawStoryCell(FEAT[i], x, y, cellW, 52, 2, 19, 39);
  }
  fillRect(M, 798, W - M * 2, 2, INK);

  // Bottom band
  const botY = 808;
  drawText(M, botY, "WHERE IT HAPPENED", 2, INK, true);
  drawMap(M, botY + 20, 420, 138);
  rectOutline(M, botY + 20, 420, 138, INK, 2);
  drawText(M, botY + 162, "NUMBERED DOTS MARK STORIES 1-15.", 1, GREY, false);

  const alsoX = M + 436;
  drawText(alsoX, botY, "ALSO ON MONDAY 23 NOVEMBER", 2, INK, true);
  const colW = Math.floor((W - alsoX - M - 8) / 2);
  for (let i = 0; i < ALSO.length; i++) {
    const col = i < 10 ? 0 : 1;
    const row = i < 10 ? i : i - 10;
    const x = alsoX + col * (colW + 8);
    const y = botY + 22 + row * 14;
    drawText(x, y, ALSO[i], 1, INK, false);
  }

  // Footer
  fillRect(M, 990, W - M * 2, 2, INK);
  drawCentered(Math.floor(W / 2), 998, "EVERY STORY HAPPENED OR WAS FIRST REPORTED ON MONDAY 23 NOVEMBER 2026. DISPUTED CLAIMS ARE ATTRIBUTED.", 1, GREY, false);
}

// PNG encoding with CRC32.
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) crcData[i] = type.charCodeAt(i);
  crcData.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcData));
  return out;
}
function encodePNG(): Uint8Array {
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, W); v.setUint32(4, H);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", new Uint8Array(idat)), chunk("IEND", new Uint8Array(0))];
  let total = 0;
  for (const p of parts) total += p.length;
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}

render();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePNG());
