import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(
  readFileSync(path.join(root, "assets.json"), "utf8"),
);
const files = readdirSync(path.join(root, "src"), { recursive: true }).filter(
  (p) => /\.tsx?$/.test(p),
);
const durations = [];
const transitions = [];
let assets = 0;
let videos = 0;
for (const file of files) {
  const tree = ts.createSourceFile(
    file,
    readFileSync(path.join(root, "src", file), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const visit = (node) => {
    if (
      ts.isJsxSelfClosingElement(node) &&
      node.tagName.getText(tree) === "Video"
    ) {
      videos++;
      assert(
        node.attributes.properties.some(
          (p) => p.name?.getText(tree) === "muted",
        ),
        "Recording audio must stay muted",
      );
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === "staticFile" &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      assert(
        statSync(path.join(root, "public", node.arguments[0].text)).size > 0,
        node.arguments[0].text,
      );
      assets++;
    }
    if (
      ts.isJsxOpeningElement(node) &&
      node.tagName.getText(tree) === "TransitionSeries.Sequence"
    ) {
      const attr = node.attributes.properties.find(
        (p) => p.name?.getText(tree) === "durationInFrames",
      );
      durations.push(Number(attr.initializer.expression.getText(tree)));
    }
    if (
      ts.isJsxSelfClosingElement(node) &&
      node.tagName.getText(tree) === "TransitionSeries.Transition"
    ) {
      const timing = node.attributes.properties.find(
        (p) => p.name?.getText(tree) === "timing",
      );
      transitions.push(
        Number(
          timing.initializer.expression.arguments[0].properties[0].initializer.getText(
            tree,
          ),
        ),
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
}
assert.equal(durations.length, 9);
assert.equal(transitions.length, 8);
assert.equal(
  durations.reduce((a, b) => a + b, 0) - transitions.reduce((a, b) => a + b, 0),
  manifest.film.frames,
);
assert.equal(manifest.film.frames / manifest.film.fps, 59);
assert.equal(manifest.film.width / manifest.film.height, 16 / 9);
assert(assets >= 15);
assert.equal(videos, 6);
const source = files
  .map((file) => readFileSync(path.join(root, "src", file), "utf8"))
  .join("\n");
assert(
  !/ScenePhoto|ExploreScreen|CheckScreen|ReportScreen|TripScreen|audio\/eish\.wav/.test(
    source,
  ),
);
for (const clip of manifest.recording.clips)
  assert(statSync(path.join(root, "public/recordings", clip.file)).size > 0);
for (const file of ["tap", "scratch", "success"]) {
  const wav = readFileSync(path.join(root, "public/audio", `${file}.wav`));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  let data;
  let rate;
  for (let offset = 12; offset + 8 <= wav.length; ) {
    const name = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (name === "fmt ") {
      assert.equal(wav.readUInt16LE(offset + 8), 1);
      assert.equal(wav.readUInt16LE(offset + 22), 16);
      rate = wav.readUInt32LE(offset + 12);
    }
    if (name === "data") data = wav.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  assert(data?.length && rate);
  let peak = 0;
  for (let i = 0; i < data.length; i += 2)
    peak = Math.max(peak, Math.abs(data.readInt16LE(i)) / 32768);
  assert(peak > 0.01 && peak < 1, file);
  console.log(
    `${file}: ${(data.length / 2 / rate).toFixed(2)}s, peak ${peak.toFixed(3)}`,
  );
}
console.log(
  `Verified 59s, 16:9, 9 scenes, 6 recording clips, ${assets} asset references and 3 WAV files. No photos, recreated screens or voice track.`,
);
