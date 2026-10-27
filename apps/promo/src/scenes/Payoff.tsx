import { FilmFrame, Headline, Reveal } from "../components";
import { colour as c } from "../theme";
export function Payoff() {
  return (
    <FilmFrame>
      <div
        style={{
          position: "absolute",
          left: 112,
          right: 112,
          top: 300,
          textAlign: "center",
        }}
      >
        <Reveal>
          <Headline style={{ fontSize: 142 }}>Less “Eish.”</Headline>
        </Reveal>
        <Reveal delay={1.35} style={{ marginTop: 48 }}>
          <Headline style={{ fontSize: 142, color: c.green }}>
            More “Let’s go.”
          </Headline>
        </Reveal>
      </div>
    </FilmFrame>
  );
}
