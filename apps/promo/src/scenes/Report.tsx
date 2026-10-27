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
import { Series, staticFile, useVideoConfig } from "remotion";
export function ReportScene() {
  const { fps } = useVideoConfig();
  return (
    <FilmFrame label="04 / SHARE">
      <div style={{ position: "absolute", left: 112, top: 250, width: 950 }}>
        <StepLabel number="04">Help the next person</StepLabel>
        <Reveal delay={0.15} style={{ marginTop: 40 }}>
          <Headline>
            Checked it?
            <br />
            <span style={{ color: c.green }}>Share it.</span>
          </Headline>
        </Reveal>
        <Reveal delay={0.7} style={{ marginTop: 42 }}>
          <Caption>
            Your check can save
            <br />
            someone else the trip.
          </Caption>
        </Reveal>
      </div>
      <Phone tilt={2}>
        <Series>
          <Series.Sequence
            name="Open question"
            durationInFrames={4 * fps}
            premountFor={fps}
          >
            <Video
              src={staticFile("recordings/report-open.mp4")}
              muted
              premountFor={fps}
              objectFit="contain"
              style={{ width: "100%", height: "100%" }}
            />
          </Series.Sequence>
          <Series.Sequence
            name="Review and submit"
            durationInFrames={2 * fps}
            premountFor={fps}
          >
            <Video
              src={staticFile("recordings/report-review.mp4")}
              muted
              premountFor={fps}
              objectFit="contain"
              style={{ width: "100%", height: "100%" }}
            />
          </Series.Sequence>
          <Series.Sequence
            name="Report received"
            durationInFrames={3.4 * fps}
            premountFor={fps}
          >
            <Video
              src={staticFile("recordings/report-received.mp4")}
              muted
              premountFor={fps}
              objectFit="contain"
              style={{ width: "100%", height: "100%" }}
            />
          </Series.Sequence>
        </Series>
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
        App screen recording · Steps shortened for this film
      </div>
    </FilmFrame>
  );
}
