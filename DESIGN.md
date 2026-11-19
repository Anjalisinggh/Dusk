# Dusk design notes

## Point of view
One real-looking 3D city seen at two hours: 7:42 pm with the sun at the end of the avenue
(the "Manhattanhenge" alignment), and 3:12 am under the moon. "Two sides. One identity."
It should read as footage, not as a web page with a background.

Dials: boldness 8, motion 5, density 2.

## Rules
- The 3D scene is the design. Words ride over it and stay few.
- The theme switch changes the hour of the same city. Nothing else about the layout changes.
- The venom ink transition (ThemeProvider.tsx, lib/venomInk.ts) is not to be touched.
- Light for both hours comes from real sky photographs (public/sky, Poly Haven CC0),
  rotated so the photographed sun or moon sits where the 3D light is.
- No Marvel names, logos or likenesses.

## Colour
The picture supplies the colour. UI is only:
- text `#fbf6ee` (evening) and `#eef2f8` (night)
- scrim tint behind text: `rgb(18 10 14)` evening, `rgb(2 4 9)` night, only on the side the words sit
- one solid button in the text colour with near-black label

## Type
Archivo with the width axis. Headings: 800 to 900 weight, 118 to 125% width.
Hero and wordmark are uppercase; section headings are sentence case. Body: 400, normal width, 17 to 18px.

## Layout
Fixed full-screen canvas. Four full-height "shots", one per stretch of the camera flight:
open (bottom left, over the skyline), left (flying down the avenue), right (street level, has the
in-page hour button), close (giant wordmark, footer). The camera path lives in `src/lib/city/scene.ts` (KEYS).

## Banned
Gradient skies made in CSS, glow blobs, glass cards, flat vector skylines, the WebGL ball toggle,
eyebrow labels, numbered sections, invented stats, em dashes.
