# Carousel

A multi-slide carousel/wizard with auto-play, looping, directional or wizard variants, named slides, and controllable index.

## Import

```tsx
import { Carousel } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Carousel>
  <Carousel.Panels>
    <Carousel.Slide>Slide 1 content</Carousel.Slide>
    <Carousel.Slide>Slide 2 content</Carousel.Slide>
    <Carousel.Slide>Slide 3 content</Carousel.Slide>
  </Carousel.Panels>
  <Carousel.Controls />
  <Carousel.Steps />
</Carousel>
```

## Props

### Carousel (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| defaultIndex | `number` | `0` | Initial slide index (uncontrolled) |
| activeIndex | `number` | - | Controlled slide index |
| onIndexChange | `(index: number) => void` | - | Callback when index changes |
| autoPlay | `boolean` | `false` | Auto-advance slides |
| interval | `number` | `5000` | Auto-play interval in ms |
| loop | `boolean` | `false` | Loop back to first slide after last |
| variant | `"directional" \| "wizard"` | `"directional"` | Visual variant (directional = arrows, wizard = steps) |
| headless | `boolean` | `false` | Disable default styling for full custom layouts |
| onFinish | `() => void` | - | Callback when "Finish" is clicked on the last slide (wizard variant) |
| className | `string` | - | Additional CSS classes |

### Carousel.Panels

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Slide elements |
| className | `string` | - | Additional CSS classes |
| transition | `"none" \| "fade"` | - | Transition effect between slides |

### Carousel.Slide

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Slide content |
| name | `string` | - | Named identifier (used by Steps display) |
| className | `string` | - | Additional CSS classes |

### Carousel.Controls

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| prevLabel | `ReactNode` | - | Custom previous button content |
| nextLabel | `ReactNode` | - | Custom next button content |
| finishLabel | `ReactNode` | - | Custom finish button content (wizard, last slide) |
| className | `string` | - | Additional CSS classes |

### Carousel.Steps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |

## Wizard Variant

```tsx
<Carousel variant="wizard" onFinish={() => console.log("done!")}>
  <Carousel.Steps />
  <Carousel.Panels transition="fade">
    <Carousel.Slide name="Account">Step 1: Create account</Carousel.Slide>
    <Carousel.Slide name="Profile">Step 2: Fill profile</Carousel.Slide>
    <Carousel.Slide name="Confirm">Step 3: Confirm details</Carousel.Slide>
  </Carousel.Panels>
  <Carousel.Controls finishLabel="Complete Setup" />
</Carousel>
```

## Auto-Play with Looping

```tsx
<Carousel autoPlay interval={3000} loop>
  <Carousel.Panels>
    <Carousel.Slide>Banner 1</Carousel.Slide>
    <Carousel.Slide>Banner 2</Carousel.Slide>
    <Carousel.Slide>Banner 3</Carousel.Slide>
  </Carousel.Panels>
</Carousel>
```
