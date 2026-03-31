# Table

A data table with sorting, pagination, search, expandable row trays, and a compound sub-component API.

## Import

```tsx
import { Table } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Table>
  <Table.Search placeholder="Filter users..." />
  <Table.Head>
    <Table.Row>
      <Table.Column label="Name" sortKey="name" />
      <Table.Column label="Email" sortKey="email" />
      <Table.Column label="Role" />
    </Table.Row>
  </Table.Head>
  <Table.Body>
    {users.map((user) => (
      <Table.Row key={user.id}>
        <Table.Cell>{user.name}</Table.Cell>
        <Table.Cell>{user.email}</Table.Cell>
        <Table.Cell>{user.role}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
  <Table.Pagination total={users.length} pageSize={10} />
</Table>
```

## Props

### Table (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Table sub-components |
| className | `string` | - | Additional CSS classes |

### Table.Head

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Header row(s) |
| className | `string` | - | Additional CSS classes |

### Table.Body

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Data rows |
| className | `string` | - | Additional CSS classes |

### Table.Row

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Cells |
| onClick | `() => void` | - | Row click handler |
| tray | `ReactNode` | - | Expandable tray content |
| trayTriggerPosition | `"start" \| "end" \| "hidden"` | - | Position of the expand/collapse trigger |
| expanded | `boolean` | - | Controlled expanded state |
| defaultExpanded | `boolean` | - | Default expanded state (uncontrolled) |
| onExpandedChange | `(expanded: boolean) => void` | - | Callback when expanded state changes |
| className | `string` | - | Additional CSS classes |

### Table.Cell

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Cell content |
| header | `boolean` | - | Render as `<th>` instead of `<td>` |
| className | `string` | - | Additional CSS classes |

### Table.Column

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | `string` | - | Column header text (required) |
| sortKey | `string` | - | Enable sorting on this key |
| className | `string` | - | Additional CSS classes |

### Table.Pagination

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| total | `number` | - | Total number of rows (required) |
| pageSize | `number` | - | Rows per page |
| className | `string` | - | Additional CSS classes |

### Table.Search

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| placeholder | `string` | - | Input placeholder |
| className | `string` | - | Additional CSS classes |

### Table.Tray / Table.RowTray

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Tray content |
| className | `string` | - | Additional CSS classes |

## Expandable Row Tray

```tsx
<Table>
  <Table.Head>
    <Table.Row>
      <Table.Column label="Order" />
      <Table.Column label="Status" />
    </Table.Row>
  </Table.Head>
  <Table.Body>
    {orders.map((order) => (
      <Table.Row
        key={order.id}
        tray={<div className="p-4">Order details for {order.id}</div>}
        trayTriggerPosition="end"
      >
        <Table.Cell>{order.id}</Table.Cell>
        <Table.Cell>{order.status}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```
