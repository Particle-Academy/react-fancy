// The lightest shade of each hue that carries WHITE text at WCAG AA (4.5:1),
// measured with tests/contrast-helper.ts on Tailwind v4's oklch palette,
// rounded to 8-bit sRGB (6.19.1). White on the 500 shade fails for most hues
// (emerald-500 is 2.47:1), so a solid fill behind white text starts here.
//
//   slate 500 4.76   gray 500 4.84   zinc 500 4.83   neutral 500 4.74
//   stone 500 4.79   red 600 4.77    orange 700 5.22 green 700 4.95
//   emerald 700 5.36 teal 700 5.36   cyan 700 5.28   sky 700 5.86
//   blue 600 5.25    indigo 500 4.58 violet 600 5.89 purple 600 5.54
//   fuchsia 600 4.66 pink 600 4.54   rose 600 4.53
//
// amber, yellow and lime take DARK text (their 950) on a light fill instead,
// and are not listed. tests/solid-fill-contrast.test.tsx measures every
// rendered pair; change a value here and that suite says whether it holds.
module.exports = {
  slate: 500, gray: 500, zinc: 500, neutral: 500, stone: 500,
  red: 600, orange: 700, green: 700, emerald: 700, teal: 700, cyan: 700, sky: 700,
  blue: 600, indigo: 500, violet: 600, purple: 600, fuchsia: 600, pink: 600, rose: 600,
};
