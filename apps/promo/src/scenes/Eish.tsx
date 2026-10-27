import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Brand, Reveal } from "../components";
import { colour as c } from "../theme";
export function Eish() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hit = spring({ frame, fps, config: { damping: 13, stiffness: 140 } });
  return (
    <AbsoluteFill
      style={{
        background: c.green,
        color: c.black,
        fontFamily: "DM Sans",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 112, top: 60 }}>
        <Brand dark size={0.75} />
      </div>
      <div
        data-film-text
        style={{
          position: "absolute",
          left: 105,
          top: 266,
          fontSize: 318,
          fontWeight: 800,
          lineHeight: 1,
          scale: interpolate(hit, [0, 1], [1.5, 1]),
          rotate: `${interpolate(hit, [0, 1], [-8, -3])}deg`,
          opacity: Math.min(1, frame / 3),
        }}
      >
        Eish.
      </div>
      <Reveal
        delay={0.6}
        style={{ position: "absolute", left: 118, bottom: 220, fontSize: 40 }}
      >
        Open doors. Closed counter.
      </Reveal>
      <Img
        src={staticFile("brand/knogo-mascot.png")}
        style={{
          position: "absolute",
          right: 125,
          bottom: -65,
          height: 850,
          width: 540,
          objectFit: "contain",
          rotate: "-8deg",
          translate: `0 ${interpolate(hit, [0, 1], [850, 0])}px`,
        }}
      />
    </AbsoluteFill>
  );
}
