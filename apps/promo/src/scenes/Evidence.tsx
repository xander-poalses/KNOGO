import {
  Caption,
  Clock3,
  FilmFrame,
  Headline,
  Phone,
  Reveal,
  StepLabel,
} from "../components";
import { colour as c } from "../theme";
import { Video } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
export function Evidence() {
  const { fps } = useVideoConfig();
  return (
    <FilmFrame label="02 / CHECK">
      <div style={{ position: "absolute", left: 112, top: 250, width: 900 }}>
        <StepLabel number="02">Check what matters</StepLabel>
        <Reveal delay={0.15} style={{ marginTop: 40 }}>
          <Headline>
            Open.
            <br />
            <span style={{ color: c.green }}>With a check.</span>
          </Headline>
        </Reveal>
        <Reveal delay={0.7} style={{ marginTop: 38 }}>
          <Caption>
            See what was reported.
            <br />
            And when.
          </Caption>
        </Reveal>
        <Reveal
          delay={1.5}
          style={{
            marginTop: 35,
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: c.green,
            fontSize: 30,
          }}
        >
          <Clock3 size={32} />
          Reported by phone
        </Reveal>
      </div>
      <Phone tilt={2}>
        <Video
          name="Status recording"
          src={staticFile("recordings/checks-open.mp4")}
          playbackRate={0.3}
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
        }}
      >
        App screen recording · Reports are not guarantees
      </div>
    </FilmFrame>
  );
}
