import { writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const rate = 48000;
let seed = 17;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
mkdirSync(new URL("../public/audio/", import.meta.url), { recursive: true });
function wav(name, seconds, sample) {
  const count = Math.round(seconds * rate);
  const data = Buffer.alloc(44 + count * 2);
  data.write("RIFF");
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(count * 2, 40);
  let peak = 0;
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const value = sample(t) * Math.min(1, t / 0.006, (seconds - t) / 0.025);
    assert(Number.isFinite(value) && Math.abs(value) < 1);
    peak = Math.max(peak, Math.abs(value));
    data.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  assert(peak > 0.05 && data.readUInt32LE(40) === count * 2);
  writeFileSync(new URL(`../public/audio/${name}.wav`, import.meta.url), data);
}
wav(
  "tap",
  0.16,
  (t) => Math.sin(2 * Math.PI * 760 * t) * Math.exp(-t * 45) * 0.55,
);
wav(
  "scratch",
  0.7,
  (t) =>
    (noise() * 0.22 + Math.sin(2 * Math.PI * (420 * t - 235 * t * t)) * 0.3) *
    Math.exp(-t * 3),
);
wav(
  "success",
  0.95,
  (t) =>
    (Math.sin(2 * Math.PI * 660 * t) +
      Math.sin(2 * Math.PI * 880 * t) * Math.min(1, t * 7)) *
    Math.exp(-t * 4) *
    0.27,
);
console.log("Three sound effects verified and written.");
