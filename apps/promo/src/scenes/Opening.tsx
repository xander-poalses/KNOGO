import { FilmFrame, Headline, Reveal } from "../components";
import { colour as c } from "../theme";
export function Opening() {
  return (
    <FilmFrame>
      <div
        style={{
          position: "absolute",
          left: 112,
          right: 112,
          top: 270,
          textAlign: "center",
        }}
      >
        <Headline style={{ fontSize: 164 }}>
          You drove
          <br />
          there.
        </Headline>
        <Reveal delay={3.5} style={{ marginTop: 50 }}>
          <div style={{ fontSize: 54, lineHeight: 1.3 }}>
            The counter?{" "}
            <span style={{ color: c.green, fontWeight: 800, fontSize: 68 }}>
              Closed.
            </span>
          </div>
        </Reveal>
      </div>
    </FilmFrame>
  );
}
