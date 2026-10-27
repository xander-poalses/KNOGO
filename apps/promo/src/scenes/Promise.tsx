import { FilmFrame, Headline, Reveal } from "../components";
import { colour as c } from "../theme";
export function PromiseScene() {
  return (
    <FilmFrame>
      <Reveal
        style={{
          position: "absolute",
          left: 112,
          right: 112,
          top: 280,
          textAlign: "center",
        }}
      >
        <Headline style={{ fontSize: 142 }}>
          Don’t make the trip
          <br />
          <span style={{ color: c.green }}>for nothing.</span>
        </Headline>
      </Reveal>
    </FilmFrame>
  );
}
