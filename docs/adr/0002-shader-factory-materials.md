# Shader Factory Pattern for Siding and Roof Materials


## Revision log

| Date | Description |
|------|-------------|
| 2026-04-11 | Document created |

## Context

Siding and roofing visual effects—T1-11 vertical groove lines for siding, corrugated metal and asphalt shingle patterns for roofing—must appear consistently across `ShedWall`, `GableEnd`, `GableRoof`, `GambrelRoof`, and `Porch`. Without centralization, each component would define its own GLSL strings and `uniforms` objects, creating five independent maintenance points for what is effectively one material per surface type.

## Decision

We will centralize all procedural shader definitions in `frontend/src/utils/shaders.js` by exporting two factory functions—`makeSidingShader(color, sidingTexture)` and `makeRoofShader(roofColor, roofMaterial)`—that return plain `ShaderMaterial` configuration objects consumed via `<shaderMaterial args={[config]} />`.

## Consequences

**Benefits:**
- A single GLSL change propagates to all four siding surfaces and all three roof surfaces simultaneously, eliminating drift between visual implementations.
- Components reduce to a single `useMemo` call: `const sidingShader = useMemo(() => makeSidingShader(color, sidingTexture), [color, sidingTexture])`. No component owns shader logic.
- The roof shader uses a `isShingle` uniform blended between metal and shingle modes (`mix(metalColor, shingleColor, isShingle)`), allowing the material switch to be driven by a uniform update rather than a geometry or material swap.
- The siding shader's `useRibs` uniform (0.0 for smooth, 1.0 for T1-11) follows the same pattern, keeping both siding variants in one shader program.

**Tradeoffs:**
- React Three Fiber's automatic `dispose()` lifecycle does not apply to `ShaderMaterial` instances created outside the JSX tree. Each call to `makeSidingShader` or `makeRoofShader` allocates a new `THREE.Color` and a new `ShaderMaterial` configuration. When `color` or `sidingTexture` changes, the old material is not automatically disposed, creating a GPU memory leak proportional to the number of color or texture changes in a session.
- Shader uniforms are embedded in a plain object rather than a `THREE.ShaderMaterial` instance, so callers cannot update individual uniforms reactively—they must recreate the entire material config. A design that passed a stable `THREE.ShaderMaterial` instance and mutated its `uniforms.color.value` directly would avoid re-creating the material on every color change.
- GLSL errors are silent at authoring time and only surface as runtime console errors. The factory functions have no validation layer.

**Operational Implications:**
- Applications that allow high-frequency color changes (e.g., a color picker with live preview) will accumulate undisposed `ShaderMaterial` instances and `THREE.Color` objects each render cycle.
- To mitigate disposal, callers should pair each `useMemo` with a `useEffect` cleanup: `return () => material.dispose()`. This is not currently enforced by convention.
- Adding a new surface type (e.g., interior wall lining) requires only calling the appropriate factory function—no duplication of GLSL.

## Implementation

1. Export `makeSidingShader(color, sidingTexture)` and `makeRoofShader(roofColor, roofMaterial)` from `frontend/src/utils/shaders.js`. Each returns a plain config object `{ uniforms, vertexShader, fragmentShader }`.
2. In each consuming component, wrap the factory call in `useMemo` keyed to the relevant store values.
3. Add `useEffect` cleanup in each consumer to call `material.dispose()` when the memoized value changes, preventing GPU memory accumulation.
4. Document the disposal requirement in `shaders.js` with a JSDoc comment so future factory consumers are warned.
5. If per-frame uniform updates are needed (e.g., animated color transitions), refactor to create a stable `THREE.ShaderMaterial` instance in a `useRef` and mutate `uniforms.color.value` directly rather than recreating the material config.

## Related Decisions

**Required by**:
- **ADR-004** — Composable components each consume the shader factories independently; without centralization, the composable architecture would require coordinating five separate shader implementations
