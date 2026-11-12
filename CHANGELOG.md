# Islecraft Refactor Changelog

## Scope
This pass improved code health, modularity, and structural clarity. No visual styling,
palette values, active balance formulas, or layout behavior were changed.

## Architectural Decoupling
- **GameBoard** is now a pure renderer and intent emitter. It no longer runs hit-testing,
  simulation, or data I/O — it only draws the board and reports tile taps/cancels.
- **Hit-testing** moved to `src/utils/coordinates.ts` (`projectToTile`, `GridCoord`,
  `clampToGrid`, `chebyshev`, `neighborsOf`).
- **World simulation** moved to `src/utils/simulationReducer.ts` (`tickWorld`,
  `deriveHeartbeat`, `isVesselType`). It is a pure reducer with no React or storage coupling.
- **Database persistence** centralized in `src/hooks/useGamePersistence.ts`, exposing a single
  `commit` path that mirrors state into the live game ref and saves in one place.

## Type & Blueprint Unification
- All item stats (labels, costs, yields, housing, unrest relief) now live in
  `src/constants/blueprints.ts` as a single source of truth.
- Removed duplicate interfaces, inline type literals, and lingering `any`-style casts:
  `BUILDING_SPEC`, `UNIT_SPEC`, `BuildingBlueprint` duplicates, and ad-hoc vessel/tile types
  are gone.
- `GridCoord` (`{ col, row }`) now replaces scattered `{ x, y }` hover/tile shapes to keep
  grid projections unambiguous.
- Vessel launch lists are typed as `BuildableVesselType[]` instead of casting through `UnitType`.

## Dead Code & Redundant Artifact Cleanup
- Deleted unused `src/game/turnEngine.ts` (no consumers).
- Deleted unused `src/components/CommandBar.tsx` (no consumers).
- Deleted unused `src/components/VictoryModal.tsx`; its scoring helpers now live in
  `src/utils/scoring.ts`.
- Removed the redundant local `VitalsChartHistory` type in favor of the shared `VitalSnapshot`.

## Hook & Effect Audit
- `useSimulationLoop` no longer depends on `game` directly; it reads a mutable ref inside the
  effect so the interval setup is stable and cannot leak on every game object re-render.
- `GameBoard` keeps a single dedicated `requestAnimationFrame` loop with proper cleanup; the
  redraw effect is a pure paint trigger.

## Verification
- `npm run typecheck` passes.
- `npm run lint` reports zero errors (one pre-existing fast-refresh warning in ToastManager).
- `npm run build` passes.
