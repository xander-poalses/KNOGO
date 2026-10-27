// Imports
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Clock3 } from "lucide-react";
import { colour as c, ease } from "./theme";

// Film Layout
export function Brand({
  dark = false,
  size = 1,
}: {
  dark?: boolean;
  size?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12 * size,
        height: 64 * size,
      }}
    >
      <Img
        src={staticFile("brand/knogo-mascot.png")}
        style={{ height: 64 * size, width: 38 * size, objectFit: "contain" }}
      />
      <Img
        src={staticFile("brand/knogo-logo.png")}
        style={{
          width: 134 * size,
          height: 48 * size,
          objectFit: "contain",
          filter: dark ? "brightness(0)" : "brightness(0) invert(1)",
        }}
      />
    </div>
  );
}

export function FilmFrame({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <AbsoluteFill
      style={{
        background: "#000000",
        color: c.white,
        overflow: "hidden",
        fontFamily: "DM Sans",
        letterSpacing: 0,
      }}
    >
      {children}
      <div style={{ position: "absolute", left: 112, top: 60 }}>
        <Brand size={0.75} />
      </div>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: 350,
            top: 78,
            fontSize: 20,
            fontWeight: 500,
            color: c.muted,
          }}
        >
          {label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        opacity: interpolate(
          frame - delay * fps,
          [0, 0.32 * fps],
          [0, 1],
          ease,
        ),
        translate: `0 ${interpolate(frame - delay * fps, [0, 0.65 * fps], [42, 0], { ...ease, easing: Easing.bezier(0.16, 1, 0.3, 1) })}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Headline({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      data-film-text
      style={{
        fontSize: 112,
        lineHeight: 1.06,
        fontWeight: 800,
        letterSpacing: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Caption({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      data-film-text
      style={{
        fontSize: 38,
        lineHeight: 1.35,
        color: c.muted,
        fontWeight: 400,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Recording Frame
export function Phone({
  children,
  tilt = -3,
}: {
  children: ReactNode;
  tilt?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(0.9 * fps),
  });
  return (
    <div
      data-phone
      style={{
        position: "absolute",
        boxSizing: "border-box",
        right: 160,
        top: 86,
        width: 464,
        height: 908,
        borderRadius: 44,
        padding: 12,
        background: "#202925",
        border: "2px solid #5c6862",
        boxShadow: "0 28px 80px #0008, inset 0 0 0 3px #070a08",
        rotate: `${tilt}deg`,
        translate: `${interpolate(settle, [0, 1], [90, 0])}px ${interpolate(settle, [0, 1], [55, 0])}px`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#000000",
          overflow: "hidden",
          borderRadius: 30,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function StepLabel({
  number,
  children,
}: {
  number: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        color: c.green,
        fontSize: 25,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          border: `1px solid ${c.line}`,
          borderRadius: 999,
          width: 48,
          height: 48,
          display: "grid",
          placeItems: "center",
          fontSize: 20,
        }}
      >
        {number}
      </span>
      {children}
    </div>
  );
}

export { Clock3 };
