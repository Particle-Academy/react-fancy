# ImagePill

An image attachment as a compact pill, with its thumbnail in a hover popover. It is the pill [`PromptInput`](./PromptInput.md) and [`Composer`](./Composer.md) draw for a pasted image, exported so a thread can show the same pill on a sent message.

## Import

```tsx
import { ImagePill } from "@particle-academy/react-fancy";
// or the subpath
import { ImagePill } from "@particle-academy/react-fancy/image-pill";
```

## Basic Usage

```tsx
// A thumbnail URL you already have
<ImagePill label="screenshot.png" src={attachment.thumbUrl} />

// A File still in memory (the object URL exists only while the preview is open)
<ImagePill label="Pasted image 1" file={file} />
```

### On a sent message

A message in a thread usually has a stored attachment and no thumbnail yet. `loadThumbnail` fetches one when somebody actually looks: it is called once, on the first hover or focus, never on render or on the server.

```tsx
<ChatThread
  messages={messages}
  renderAttachment={(a) => (
    <ImagePill
      label={a.name}
      data-attachment-id={a.id}
      loadThumbnail={() => api.signedThumbnailUrl(a.id)}
    />
  )}
/>
```

While the promise is pending the preview shows `labels.loading` and is `aria-busy`. If it rejects, the preview shows `labels.error` and the loader is not called again.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | The pill's text, the thumbnail's `alt` and the accessible name |
| `src` | `string` | - | A thumbnail URL. Wins over `file` and `loadThumbnail` |
| `file` | `Blob \| null` | - | A File or Blob to preview. Its object URL is made when the preview opens and revoked when it closes |
| `loadThumbnail` | `() => Promise<string>` | - | Fetch the thumbnail URL lazily, once, on the first hover or focus |
| `open` | `boolean` | - | Whether the preview is open, controlled |
| `defaultOpen` | `boolean` | `false` | Starting open state, uncontrolled |
| `onOpenChange` | `(open: boolean) => void` | - | Called when hover, focus, blur or Escape asks to open or close |
| `placement` | `Placement` | `"top"` | Where the preview opens. Flips when there is no room |
| `preview` | `ReactNode` | - | Replaces the preview's content |
| `previewClassName` | `string` | - | Merged onto the preview panel's classes |
| `previewProps` | `HTMLAttributes<HTMLSpanElement>` | - | Attributes for the preview content's wrapper, e.g. your own `data-*` handle |
| `labels` | `ImagePillLabels` | see below | Every word, for translation |

Other props, including `id`, `className` and any `data-*`, reach the pill itself.

### labels

| Key | Default |
|------|------|
| `loading` | `"Loading preview…"` |
| `error` | `"Preview unavailable"` |

## Behavior

- **Opens on hover and on keyboard focus.** The pill is focusable (`tabIndex={0}`), so a keyboard user reaches the same preview. Blur and Escape close it.
- **The preview is a portalled `Popover`**, so a scrolling container cannot clip it.
- **An image that fails to load shows the label instead** (a Content-Security-Policy without `blob:` in `img-src` is the usual reason), never an empty box.
- **ARIA:** the pill is `role="img"` named by `label`; the thumbnail's `alt` is `label`.
- SSR-safe: nothing touches `URL` or calls `loadThumbnail` during render.

## Stable handles

| Handle | On |
|------|------|
| `data-react-fancy-image-pill` | The pill, with `data-state="open" \| "closed"` and `data-thumbnail="none" \| "idle" \| "loading" \| "ready" \| "error"` |
| `data-react-fancy-image-pill-preview` | The preview content's wrapper, `aria-busy` while loading |
| `data-react-fancy-image-pill-loading` | The loading text |
| `data-react-fancy-image-pill-error` | The error text, after `loadThumbnail` rejects |

Inside a composer the pill also carries `data-react-fancy-composer-image-pill` and its preview `data-react-fancy-composer-paste-pill-preview`, as before.
