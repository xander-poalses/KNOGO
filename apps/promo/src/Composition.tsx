// Imports
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  AbsoluteFill,
  Composition,
  Folder,
  Sequence,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import "./fonts";
import { Opening } from "./scenes/Opening";
import { Eish } from "./scenes/Eish";
import { PromiseScene } from "./scenes/Promise";
import { Discover } from "./scenes/Discover";
import { Evidence } from "./scenes/Evidence";
import { FuelScene } from "./scenes/Fuel";
import { ReportScene } from "./scenes/Report";
import { Payoff } from "./scenes/Payoff";
import { End } from "./scenes/End";

// Film Timeline
export function KnogoPromo() {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={237} premountFor={fps}>
          <Opening />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={132} premountFor={fps}>
          <Eish />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={147} premountFor={fps}>
          <PromiseScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={312} premountFor={fps}>
          <Discover />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={312} premountFor={fps}>
          <Evidence />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={162} premountFor={fps}>
          <FuelScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={282} premountFor={fps}>
          <ReportScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={132} premountFor={fps}>
          <Payoff />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={150} premountFor={fps}>
          <End />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio
        src={staticFile("audio/original-music.m4a")}
        volume={(frame) => {
          const base = interpolate(
            frame,
            [0, 18, 1700, 1769],
            [0, 0.82, 0.82, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return base;
        }}
      />
      <Sequence
        name="Eish punctuation"
        from={229}
        durationInFrames={25}
        layout="none"
      >
        <Audio src={staticFile("audio/scratch.wav")} volume={0.32} />
      </Sequence>
      <Sequence
        name="Open answer"
        from={1290}
        durationInFrames={12}
        layout="none"
      >
        <Audio src={staticFile("audio/tap.wav")} volume={0.4} />
      </Sequence>
      <Sequence
        name="Review report"
        from={1368}
        durationInFrames={12}
        layout="none"
      >
        <Audio src={staticFile("audio/tap.wav")} volume={0.4} />
      </Sequence>
      <Sequence
        name="Report sent"
        from={1410}
        durationInFrames={35}
        layout="none"
      >
        <Audio src={staticFile("audio/success.wav")} volume={0.3} />
      </Sequence>
    </AbsoluteFill>
  );
}

// Composition Registration
export function MyComposition() {
  return (
    <>
      <Composition
        id="KNOGO-Promo"
        component={KnogoPromo}
        durationInFrames={1770}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Folder name="Scenes">
        <Composition
          id="Opening"
          component={Opening}
          durationInFrames={237}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
        <Composition
          id="Eish"
          component={Eish}
          durationInFrames={132}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
        <Composition
          id="Promise"
          component={PromiseScene}
          durationInFrames={147}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
        <Composition
          id="Discover"
          component={Discover}
          durationInFrames={312}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
        <Composition
          id="Evidence"
          component={Evidence}
          durationInFrames={312}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
        <Composition
          id="Fuel"
          component={FuelScene}
          durationInFrames={162}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
        <Composition
          id="Report"
          component={ReportScene}
          durationInFrames={282}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
        <Composition
          id="Payoff"
          component={Payoff}
          durationInFrames={132}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
        <Composition
          id="End"
          component={End}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{}}
        />
      </Folder>
    </>
  );
}
