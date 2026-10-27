import { AbsoluteFill, Img, staticFile } from "remotion";
import { Brand, Headline, Reveal } from "../components";
import { colour as c } from "../theme";
export function End() {
  return (
    <AbsoluteFill
      style={{
        background: c.green,
        color: c.black,
        fontFamily: "DM Sans",
        overflow: "hidden",
      }}
    >
      <Reveal style={{ position: "absolute", left: 112, top: 170 }}>
        <Brand dark size={2.7} />
      </Reveal>
      <Reveal
        delay={0.25}
        style={{ position: "absolute", left: 112, top: 430, width: 1020 }}
      >
        <Headline style={{ fontSize: 110 }}>
          Know before
          <br />
          you go.
        </Headline>
      </Reveal>
      <Reveal
        delay={0.65}
        style={{
          position: "absolute",
          left: 118,
          top: 780,
          fontSize: 34,
          lineHeight: 1.45,
        }}
      >
        Coming soon to the
        <br />
        <strong>App Store and Google Play.</strong>
      </Reveal>
      <Img
        src={staticFile("brand/community-meerkats.png")}
        style={{
          position: "absolute",
          right: 70,
          bottom: 0,
          width: 660,
          height: 730,
          objectFit: "contain",
          objectPosition: "bottom",
        }}
      />
    </AbsoluteFill>
  );
}
