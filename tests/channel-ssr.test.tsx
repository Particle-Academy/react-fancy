// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { ChannelPlayer } from "../src/components/ChannelPlayer";
import { ChannelGuide } from "../src/components/ChannelGuide";
import { Playlist } from "../src/components/Playlist";
import { MediaQueue } from "../src/components/MediaQueue";
import { MediaEmbed } from "../src/components/MediaEmbed";
import { NowPlaying } from "../src/components/NowPlaying";
import { LiveBadge } from "../src/components/LiveBadge";
import { createChannelValue, selectChannel } from "../src/utils/media-channel";
import type { Channel } from "../src/utils/media-channel";

/**
 * Server rendering, under the `node` environment on purpose (see
 * streaming-audio-ssr.test.tsx): under jsdom a stray `window` or `navigator`
 * read during render resolves and the test proves nothing.
 */

const LIST: Channel = {
  id: "list",
  name: "Mixtape",
  kind: "playlist",
  tracks: [
    { id: "a", title: "Song A", source: { type: "file", url: "/media/a.mp3" } },
    { id: "b", title: "Song B", source: { type: "file", url: "/media/b.mp3" } },
  ],
};
const LIVE: Channel = { id: "live", name: "Radio", kind: "live", source: { type: "stream", url: "https://ice.example.com/live" } };
const TWITCH: Channel = { id: "tw", name: "Stream", kind: "live", source: { type: "embed", provider: "twitch", id: "some_channel" } };
const CHANNELS = [LIST, LIVE, TWITCH];

describe("channel components render on the server", () => {
  it("with no DOM globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("the player, playing, on each kind", () => {
    for (const channel of CHANNELS) {
      const value = { ...selectChannel(createChannelValue(), channel), playing: true };
      const html = renderToString(<ChannelPlayer id="p" channels={CHANNELS} value={value} onChange={() => {}} />);
      expect(html).toContain("data-react-fancy-channel-player");
      expect(html).toContain(`data-channel-id="${channel.id}"`);
    }
  });

  it("an embed renders its poster, never the provider's iframe", () => {
    const html = renderToString(
      <MediaEmbed source={{ type: "embed", provider: "youtube", id: "dQw4w9WgXcQ" }} playing title="Launch" />,
    );
    expect(html).toContain("data-embed-poster");
    expect(html).not.toContain("<iframe");
  });

  it("the guide, playlist, queue, now playing and badge", () => {
    const value = selectChannel(createChannelValue(), LIST);
    const html = renderToString(
      <>
        <ChannelGuide channels={CHANNELS} value={value} onChange={() => {}} />
        <Playlist channel={LIST} value={value} onChange={() => {}} onTracksChange={() => {}} />
        <MediaQueue channel={LIST} value={value} />
        <NowPlaying channel={LIVE} />
        <LiveBadge status="offline" />
      </>,
    );
    expect(html).toContain('data-channel-guide-item="tw"');
    expect(html).toContain('data-playlist-track="b"');
    expect(html).toContain('data-queue-track="b"');
    expect(html).toContain('data-live-status="offline"');
  });
});
