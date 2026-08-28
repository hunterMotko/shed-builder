# ADR-0014: The shed is lit once, and the shaders hand their colour back

## Status

Accepted

## Revision log

| Date | Description |
|------|-------------|
| 2026-08-27 | Document created |

## Context

Reference Match exists so a render can be held against a photograph
(ADR-0012). It could not do that job, because a paint colour did not survive
the trip to the screen.

`#EFD7BA` almond siding rendered **`#6C5943`**, a mid brown. `#400C0C`
burgundy trim rendered **`#090000`**, which is black. A `#593C2C` roof rendered
`#0F0A07`. Every fixture on the page was suspected of being sampled wrong, and
none of them were: the lit lower wall of `12-16-gable-front.jpg` measures
`#F1DAB9` against the `#EFD7BA` the fixture asked for, and four separate
patches of that shed's trim come back between `#3E0708` and `#420B0B`. The
fixtures were right. The renderer was not.

Two faults, compounding.

**The custom shaders were a hole in the colour pipeline.** Three converts
every colour to linear on the way in — `new THREE.Color('#EFD7BA')` is a linear
triple by the time it reaches a uniform — and converts back to sRGB on the way
out, in the `colorspace_fragment` chunk. `makeSidingShader` and
`makeRoofShader` wrote `gl_FragColor` and stopped, so the linear value went to
the framebuffer and was displayed as though it were sRGB. That alone accounts
for almost all of the error: predicting `#755C42` for the almond from the linear
value and the shader's own Lambert term lands within four values of the `#6C5943`
measured off the screen.

**Nothing agreed about where the sun was.** The shaders bake their own Lambert
against two hardcoded light positions. `App.jsx` had lights at those positions.
`ReferenceMatch.jsx` had a directional light somewhere else entirely — so on
that page a wall and the trim board nailed to it were lit from different skies,
and changing the page's lights moved the trim and left the siding exactly where
it was. Worse, `App.jsx`'s were `pointLight`s: three gives those physical
falloff, so a light 25 units from the shed with `intensity={1}` arrives at
about 1/625 of that. The trim was lit by ambient alone.

Painted trim also carried `metalness` between 0.1 and 0.25. A painted board is
a dielectric; the metalness was eating a quarter of the diffuse albedo of the
darkest colour on the building.

## Decision

**A custom shader ends by handing its colour to the renderer.**

```glsl
gl_FragColor = vec4(/* … */, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

Including the chunks rather than writing the transform means the shaders follow
whatever the renderer is set to, tone mapping included, instead of pinning a
second opinion about it.

**There is one light rig, `SHED_LIGHTING` in `utils/shaders.js`.** The shaders
template their baked positions out of it, and `ShedLights` builds the scene's
real lights from the same constant, so the two cannot drift. Both pages mount
`ShedLights` rather than writing their own.

The rig is overcast daylight, which is the weather in every Reference Photo: a
large ambient, a little direction. A lit wall lands near its own colour, which
is the property that makes a paint colour comparable to a photograph at all.

**Both canvases are `flat`** — `NoToneMapping`. ACES is a filmic curve built
for HDR scenes; on a matte building under flat light it moves a colour
somewhere the customer did not pick.

**Painted trim is `metalness: 0`.**

## Consequences

**Benefits**

- A colour renders as the colour that was chosen. That is what the
  Configurator promises a customer and what Reference Match needs to do its job.
- The page's lights now light the whole shed. Fidelity work on lighting is
  possible where before it silently reached half the building.
- `utils/shaders.test.js` asserts the output chunks are present and that
  `gl_FragColor` is written before them. Both faults were invisible in the
  source and cost a long time to find; neither can come back quietly.

**Tradeoffs**

- The shaders still bake their own Lambert rather than joining three's light
  loop. Adding a light to a scene will not light the siding — it will light the
  trim and nothing else. `SHED_LIGHTING` makes that one place to change instead
  of three, but it does not make the shaders honest about lights.
- `sceneAmbient` is 3.0, which looks absurd beside the 0.6 it replaced. Three
  divides an ambient by π before it reaches a diffuse surface; the burgundy trim
  is the calibration, and it has to come back out at the `#400707` the
  photograph measures. That puts white trim at the clip, which is where the
  photographs have it too.
- Dropping tone mapping clips a bright specular. On a metal roof that is what
  the photographs show anyway.

## Related Decisions

- **ADR-0002** — unchanged. The shaders are still factory functions and one
  GLSL change still reaches every surface. This is about what the last line of
  them says.
- **ADR-0012** — the reason any of this matters. A reconstruction that cannot
  reproduce a colour cannot be compared to a photograph of one.
- **ADR-0013** — the roof slab. The fascia that boxes its cut edge arrived with
  this work, in `gableFasciaBoards`.
