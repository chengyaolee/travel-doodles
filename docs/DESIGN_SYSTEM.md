# Travel Doodles UI

A clean digital whiteboard with a human hand. Photographs provide color; ink,
type, and whitespace provide the interface. The existing explore map keeps its
own cartographic styling.

## Foundations

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#FFFFFF` | `#111111` |
| Secondary surface | `#F7F7F7` | `#191919` |
| Elevated surface | `#F0F0F0` | `#252525` |
| Primary ink | `#181818` | `#F5F5F5` |
| Secondary ink | `#666666` | `#A3A3A3` |
| Border | `#DDDDDD` | `#383838` |
| Quiet divider | `#EBEBEB` | `#292929` |

Tokens live in `src/app/globals.css`. Put base rules in the base layer and
shared components in the components layer so Tailwind utilities can override
them. Never add an unlayered margin or padding reset.

## Typography

- Self-hosted variable Geist: navigation, controls, captions, place headings.
- Self-hosted variable Caveat: wordmark, expressive words, photo labels, notes.
- Interface text: 13–14px; secondary metadata: 11–12px.
- Use tight tracking on display text, normal tracking on controls, and tabular
  numbers for social counts. Avoid monospaced prose and handwritten controls.

## Spacing and surfaces

- Use a 4px spacing rhythm: 8, 12, 16, 24, 32, 48px.
- Desktop panel padding: 24px; mobile panel padding: 20px.
- Main controls: 44px high. Group related controls; give groups breathing room.
- Use quiet dividers rather than nested bordered cards. Reserve slight
  irregularity and elevation for the photographs and primary action.
- Controls use small monochrome SVG icons with a consistent 1.5px stroke.

## Behavior

- Appearance supports Light, Dark, and System, persists through `next-themes`,
  and resolves before paint.
- Preserve visible keyboard focus and native controls where practical.
- Photographs lift gently; buttons give restrained hover and press feedback.
- Respect reduced motion. Keep navigation and filters available on mobile;
  regional stories use an expandable bottom sheet with safe-area padding.
