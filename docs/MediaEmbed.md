# MediaEmbed

A provider's own player in an iframe: YouTube (privacy-enhanced host), Vimeo,
Twitch, or any provider you add with `registerEmbedProvider` (see
[Channels](./Channels.md#embeds-built-in-and-your-own)).

**Nothing loads from the provider until it is played.** Until then it is a
poster with a play button named "Play {title} on {provider}". After that,
`playing` drives the player through the provider's API where there is one
(YouTube and Vimeo). Twitch's player is not driven.

The iframe is sandboxed (`allow-scripts allow-same-origin allow-presentation
allow-popups`) and sends `strict-origin-when-cross-origin` referrers. Its URL
must be `https:`.

## Import

```tsx
import { MediaEmbed } from "@particle-academy/react-fancy";
import { MediaEmbed } from "@particle-academy/react-fancy/media-embed";
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `source` | `{ type: "embed", provider, id }` | | |
| `playing` | `boolean` | | First `true` loads the player, autoplaying |
| `onPlayingChange` | `(playing) => void` | | The poster asks to play |
| `title` | `string` | the provider's name | The iframe title and the poster's name |
| `poster` | `string` | | Shown before load. Host it yourself |
| `onError` | `() => void` | | Unknown provider, or an id it does not accept |
| `labels` | `Partial<MediaEmbedLabels>` | English | `play`, `unsupported` |

## Handles

`data-react-fancy-media-embed`, `data-embed-provider`, `data-embed-loaded`,
`data-embed-poster`, `data-embed-error`.
