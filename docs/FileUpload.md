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
| `maxFiles` | `number` | - | Maximum number of files |
| `maxSize` | `number` | - | Maximum file size in bytes (files exceeding this are silently filtered) |
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
