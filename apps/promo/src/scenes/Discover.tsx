import {
  Caption,
  FilmFrame,
  Headline,
  Phone,
  Reveal,
  StepLabel,
} from "../components";
import { Video } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
export function Discover() {
  const { fps } = useVideoConfig();
  return (
    <FilmFrame label="01 / FIND">
      <div style={{ position: "absolute", left: 112, top: 250, width: 930 }}>
        <StepLabel number="01">Find a place</StepLabel>
        <Reveal delay={0.15} style={{ marginTop: 40 }}>
          <Headline>
            Find your spot.
            <br />
            Not a mission.
          </Headline>
        </Reveal>
        <Reveal delay={0.7} style={{ marginTop: 42 }}>
          <Caption>
            Places near you.
            <br />
            One place to check.
          </Caption>
        </Reveal>
      </div>
      <Phone>
        <Video
          name="Search recording"
          src={staticFile("recordings/discover.mp4")}
          playbackRate={0.75}
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
          color: "#aebbb1",
          fontSize: 22,
        }}
      >
        App screen recording · Not a live status
      </div>
    </FilmFrame>
  );
}
