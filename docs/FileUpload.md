# FileUpload

Compound file upload component with drag-and-drop dropzone and file list display (list or thumbnail mode).

## Import

```tsx
import { FileUpload } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<FileUpload onChange={(files) => console.log(files)}>
  <FileUpload.Dropzone />
  <FileUpload.List />
</FileUpload>
```

## Components

### `FileUpload` (root)

Provides file state context to its children.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Must contain `Dropzone` and/or `List` |
| `value` | `File[]` | - | Controlled file list |
| `onChange` | `(files: File[]) => void` | - | Callback when files change |
| `accept` | `string` | - | Accepted file types (e.g. `"image/*,.pdf"`) |
| `multiple` | `boolean` | `true` | Allow multiple files |
| `onReject` | `(rejections: FileRejection[]) => void` | - | Called with the files a gesture refused. See [Refused files](#refused-files) |
| `maxFiles` | `number` | - | Maximum number of files. The overflow is refused |
| `maxSize` | `number` | - | Maximum file size in bytes. Larger files are refused |
| `disabled` | `boolean` | `false` | Disables upload and removal |
| `className` | `string` | - | Additional CSS classes on the wrapper |

### `FileUpload.Dropzone`

Drag-and-drop area that also opens a file picker on click.

It contains a native browse `<button type="button">` (`data-react-fancy-file-upload-browse`), so keyboard users can Tab to it and open the picker with Enter or Space. On the default zone the button wraps the icon and copy; with custom `children` it is visually hidden beside them and the zone draws the focus ring. When `disabled`, the button is disabled and the zone carries `aria-disabled="true"`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Default upload icon + text | Custom dropzone content |
| `browseLabel` | `string` | The visible copy, or `"Browse files"` with custom children | Accessible name of the browse button |
| `className` | `string` | - | Additional CSS classes |

### `FileUpload.List`

Displays the uploaded files with remove buttons.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `thumbnail` | `boolean` | `false` | Show image thumbnails in a grid instead of a file list |
| `className` | `string` | - | Additional CSS classes |

## Refused files

`accept`, `maxSize` and `maxFiles` refuse files without any message of their own. `onReject` is how you tell the person, whichever way the files arrived: the picker, a drop, or `useFileUpload().addFiles`.

```tsx
<FileUpload
  accept="image/*"
  maxSize={5 * 1024 * 1024}
  maxFiles={5}
  onReject={(rejections) => setError(rejections.map((r) => `${r.name}: ${r.reason}`).join(", "))}
>
  <FileUpload.Dropzone />
</FileUpload>
```

Each entry is plain JSON, one per file, under the first rule that file failed:

```ts
{ name: "scan.tiff", size: 7340032, type: "image/tiff", reason: "maxSize" }
```

| `reason` | Means |
|---|---|
| `accept` | The file does not match `accept` |
| `maxSize` | The file is larger than `maxSize` |
| `maxFiles` | The file is past `maxFiles`, or is an extra file in a batch dropped on a `multiple={false}` field |

It fires after `onChange`, and not at all when nothing was refused. A file replaced on a `multiple={false}` field was not refused, so it is not reported.

## Examples

### With file constraints

```tsx
<FileUpload
  accept="image/*"
  maxFiles={5}
  maxSize={5 * 1024 * 1024}
  onChange={setFiles}
>
  <FileUpload.Dropzone>
    <p>Drop images here (max 5MB each)</p>
  </FileUpload.Dropzone>
  <FileUpload.List thumbnail />
</FileUpload>
```

### List mode

```tsx
<FileUpload onChange={handleUpload}>
  <FileUpload.Dropzone />
  <FileUpload.List />
</FileUpload>
```
