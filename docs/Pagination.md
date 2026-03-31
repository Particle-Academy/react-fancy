# Pagination

A page navigation component with previous/next buttons, page numbers, and ellipsis for large ranges.

## Import

```tsx
import { Pagination } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Pagination page={1} totalPages={10} onPageChange={setPage} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| page | `number` | **required** | Current active page (1-based) |
| onPageChange | `(page: number) => void` | **required** | Callback when a page is selected |
| totalPages | `number` | **required** | Total number of pages |
| siblingCount | `number` | `1` | Number of sibling pages shown around the current page |
| className | `string` | - | Additional CSS classes |

Renders `null` when `totalPages <= 1`. Automatically inserts ellipsis when the page count exceeds the visible slot count.

## Examples

### Basic pagination

```tsx
const [page, setPage] = useState(1);

<Pagination page={page} totalPages={20} onPageChange={setPage} />
```

### More visible siblings

```tsx
<Pagination
  page={page}
  totalPages={50}
  onPageChange={setPage}
  siblingCount={2}
/>
```
