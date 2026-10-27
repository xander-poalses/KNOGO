import {
  Caption,
  FilmFrame,
  Headline,
  Phone,
  Reveal,
  StepLabel,
} from "../components";
import { colour as c } from "../theme";
import { Video } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
export function FuelScene() {
  const { fps } = useVideoConfig();
  return (
    <FilmFrame label="03 / PLAN">
      <div style={{ position: "absolute", left: 112, top: 250, width: 960 }}>
        <StepLabel number="03">Plan the drive</StepLabel>
        <Reveal delay={0.15} style={{ marginTop: 42 }}>
          <Headline style={{ fontSize: 98 }}>The fuel bill?</Headline>
        </Reveal>
        <Reveal
          delay={0.4}
          style={{
            marginTop: 26,
            fontSize: 157,
            fontWeight: 800,
            lineHeight: 1.1,
            color: c.green,
          }}
        >
          R18.23
        </Reveal>
        <Reveal delay={0.7} style={{ marginTop: 32 }}>
          <Caption>Part of the plan.</Caption>
        </Reveal>
      </div>
      <Phone tilt={-2}>
        <Video
          name="Trip recording"
          src={staticFile("recordings/trip.mp4")}
          muted
          premountFor={fps}
          objectFit="contain"
          style={{ width: "100%", height: "100%" }}
        />
      </Phone>
      <div
        style={{
          position: "absolute",
          left: 112,
          bottom: 70,
          color: c.muted,
          fontSize: 22,
          width: 900,
        }}
      >
        Example estimate. Your route, car and fuel price affect cost.
      </div>
    </FilmFrame>
  );
}
