// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";

import { StreamingAudio } from "../src/components/StreamingAudio";

/**
 * Server rendering -- a separate FILE under the `node` environment on purpose
 * (see stepper-ssr.test.tsx): under jsdom a stray `window` or `navigator` read
 * during render resolves happily and the test proves nothing.
 */
describe("StreamingAudio renders on the server", () => {
  it("renders the station, the badge and the controls with no DOM globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const html = renderToString(
      <StreamingAudio
        id="radio"
        stations={[
          { id: "jazz", name: "Jazz FM", src: "https://ice.example.com/jazz" },
          { id: "ep1", name: "Episode 1", src: "/media/episode-1.mp3" },
        ]}
        value={{ stationId: "jazz", playing: true, volume: 0.5, muted: false }}
        onChange={() => {}}
        nowPlaying="So What"
      />,
    );

    expect(html).toContain("data-react-fancy-streaming-audio");
    expect(html).toContain('data-streaming-station="jazz"');
    expect(html).toContain("Jazz FM");
    expect(html).toContain("So What");
    expect(html).toContain("LIVE");
    expect(html).toContain('data-streaming-control="play"');
    expect(html).toContain('data-streaming-control="mute"');
    expect(html).toContain('data-streaming-control="volume"');
    expect(html).toContain("data-streaming-live");
    // The element is attached on the client, never in markup: a src in the
    // server HTML would start a connection before hydration.
    expect(html).toMatch(/<audio(?![^>]*\ssrc=)[^>]*>/);
  });
});
