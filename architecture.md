# Islecraft System Architecture & Technical Specifications

## 0. Status

### Done

- **Vite + React + TypeScript Foundation**: Single-page application bootstrapped with strict type definitions and Tailwind CSS utility styling.
- **IndexedDB Persistence Layer**: `IslecraftDB` configured via Dexie.js (`src/db/gameDatabase.ts`, `src/hooks/useGamePersistence.ts`) with tables for active session snapshots and archived match history.
- **Dual-Mode Responsive Viewport Shell**: Height-driven layout toggle separating short-height landscape mobile phones (Mode A: right-side vertical rail) from desktop, laptop, and tablet displays (Mode B: top-aligned map with a floating, multi-stage bottom command drawer).
- **Illuminated Cartographic Board Canvas**: High-DPI HTML5 canvas renderer (`src/components/GameBoard.tsx`) implementing a 29×16 discrete grid with an 18th-century nautical chart palette, layered substrate rendering, and autotiling corner smoothing.
- **Modular Map Catalog**: Map data decoupled into raw text assets parsed via Vite `?raw` imports (`src/constants/mapData.ts`), supporting multiple configurations: _Twin Reaches_, _Shattered Atoll_, _Caldera Sound_, and _Iron Strait_.
- **Coordinate & Projection Utilities**: Discrete integer tile projection, boundary clamping, and Chebyshev/Manhattan distance helpers isolated in `src/utils/coordinates.ts`.
- **Centralized Blueprints Registry**: Declarative balance schemas in `src/constants/blueprints.ts` establishing building and vessel costs, placement constraints, and yields.
- **Procedural Vector Sprite Engine**: Canvas 2D path dictionary (`src/utils/spriteRenderer.ts`) rendering resolution-independent vector graphics for terrestrial structures, sailing vessels, and dynamic actors.
- **Dynamic Simulation Reducer**: Autonomous entity tick loop (`src/utils/simulationReducer.ts`, `src/hooks/useSimulationLoop.ts`) executing drift routines for weather (Squalls, Tempests), marine life (Fish Shoals), and pirate vessels (Rogue Galleons).
- **Vessel Command & Naval Mechanics**: Ship selection reticles, step-wise adjacent movement, fishing shoal harvesting, and privateer combat bounties.
- **Economic Audit Engine**: Comprehensive turn-end accounting (`src/utils/economyEngine.ts`) modeling food sustenance, population growth, starvation mortality, mint revenue, and housing caps.
- **Multi-Screen Application Flow**: Title Screen (`src/components/TitleScreen.tsx`) with landscape orientation guard and map selection; Retrospective Screen (`src/components/RetrospectiveScreen.tsx`) with SVG vitals trend charts.
- **Autonomous Utility AI Opponent**: Heuristic decision evaluator (`src/utils/governorAI.ts`) driving solo games against Player 2 (Blue Faction).

### TODO

- **Settlement Dispatch Modal Mount Fix**: Resolve the issue where pressing `Escape` or clicking the newspaper icon pauses the game but fails to display `<TurnGazetteModal/>` due to missing root JSX mounting or unhandled mid-turn null audit reports.
- **PWA Service Worker & Manifest Configuration**: Install and configure `vite-plugin-pwa` with Workbox caching strategies, web application manifest entries (`"orientation": "landscape"`), and offline execution assets.
- **Native Web Audio Synthesizer**: Build a procedural chiptune/vintage sound generator (`src/utils/audioBus.ts`) using the native `AudioContext` for building placements, naval artillery, coin transactions, and storm ambiance.
- **Hexagonal Grid Migration (Post-MVP)**: Refactor board coordinates to an axial $(q, r)$ topology with 6-directional navigation and uniform circular bastion defense radii.

---

## 1. Architectural Overview & Design Principles

Islecraft is built as an offline-first, mobile-first responsive Progressive Web Application recreating classic 1981 dual-island territory management strategy (_Utopia_), re-themed to an Age of Sail maritime setting with a Bitcoin-denominated economy.

```
+-------------------------------------------------------------------------+
|                              App Shell                                  |
|   (TitleScreen | GameContainer | TurnGazetteModal | RetrospectiveScreen)|
+-------------------------------------------------------------------------+
       |                                                 |
       v                                                 v
+-----------------------------+               +---------------------------+
|      React UI Chrome        |               |   GameBoard Component     |
| - Header / Telemetry Bar    |               | - HTML5 Canvas (29x16)    |
| - Floating CommandConsole   |               | - Sprite Renderer         |
| - RightRail (Mode A Phone)  |               | - Input Intent Emitter    |
+-----------------------------+               +---------------------------+
       |                                                 |
       +--------------------+     +----------------------+
                            |     |
                            v     v
              +-----------------------------------+
              |     Central State & Reducers      |
              | - useSimulationLoop (Real-Time)   |
              | - simulationReducer (World Ticks) |
              | - economyEngine (Turn Audits)     |
              | - governorAI (Solo Opponent)      |
              +-----------------------------------+
                            |
                            v
              +-----------------------------------+
              |    Dexie.js Persistence Layer     |
              | - IslecraftDB.activeGame          |
              | - IslecraftDB.matchHistory        |
              +-----------------------------------+

```

### Core Architecture Rules

1. **Canvas as a Pure Renderer & Intent Emitter**: The canvas does not own simulation state, compute financial formulas, or perform database writes. It accepts read-only game states, paints the board, and emits discrete cell coordinate events (`onTileSelect`, `onCommandVessel`).
2. **Deterministic State Transitions**: Simulation ticks and turn audits are pure reducer functions. Given state $S_t$ and event $E$, the next state $S_{t+1}$ is computed without side-effects.
3. **Decoupled Persistence**: IndexedDB interactions are asynchronous and handled by custom hooks (`useGamePersistence.ts`), preventing database latency from dropping frame rates in the canvas loop.
4. **Single-Viewport Integrity**: Layout styles enforce `h-screen w-screen overflow-hidden` with hardware safe-area paddings, guaranteeing that neither vertical nor horizontal document scrollbars occur during gameplay.

---

## 2. Directory Structure & Modular Breakdown

```
src/
├── App.tsx                      # Root orchestration, screen mode router, modal mounting
├── main.tsx                     # React DOM entry point
├── components/
│   ├── CommandConsole.tsx       # Mode B floating bottom drawer (Tabs, Cards, Intelligence)
│   ├── GameBoard.tsx            # HiDPI HTML5 canvas renderer and pointer projection
│   ├── RetrospectiveScreen.tsx  # Game-over analysis and historical hindsight view
│   ├── RightRail.tsx            # Mode A compact vertical command column for mobile
│   ├── TitleScreen.tsx          # Initial entry, orientation check, and map selector
│   ├── ToastManager.tsx         # Ephemeral floating action notifications
│   ├── TurnGazetteModal.tsx     # Colonial broadsheet census and economic audit report
│   └── VitalsCharts.tsx         # SVG sparkline and demographic progression graphs
├── constants/
│   ├── blueprints.ts            # Declarative building, vessel, and actor balance specs
│   ├── mapData.ts               # Map parser and tile enumeration
│   └── maps/
│       ├── caldera-sound.txt    # Circular gulf terrain matrix
│       ├── iron-strait.txt      # Narrow 2-tile chokepoint terrain matrix
│       ├── shattered-atoll.txt  # Fragmented maritime archipelago matrix
│       └── twin-reaches.txt     # Authentic interlocking boot configuration
├── db/
│   └── gameDatabase.ts          # Dexie.js schema definition and database instance
├── hooks/
│   ├── useGamePersistence.ts    # Auto-save and state rehydration hook
│   ├── useMediaQuery.ts         # Height- and width-based responsive breakpoint hooks
│   └── useSimulationLoop.ts     # Real-time 60s countdown and 1.5s actor tick loop
├── types/
│   └── game.ts                  # Domain models, faction interfaces, and tile types
└── utils/
    ├── coordinates.ts           # Grid boundary checks, hit testing, Chebyshev distances
    ├── economyEngine.ts         # Turn-end census, agricultural math, and mutiny thresholds
    ├── entitySpawner.ts         # Weather and neutral actor generation helpers
    ├── governorAI.ts            # Utility-scoring autonomous opponent for Player 2
    ├── placementRules.ts        # Spatial territorial validation for builds and launches
    ├── scoring.ts               # Campaign score tallying and historical rank mapping
    ├── simulationReducer.ts     # Pure state reducer for actor movement and encounters
    └── spriteRenderer.ts        # Procedural vector drawing commands for canvas entities

```

---

## 3. Responsive Layout Engine

The interface utilizes a conditional layout strategy driven by viewport dimensions:

```
+-------------------------------------------------------------------------+
| Mode A: Mobile Landscape (height <= 520px OR aspect-ratio > 1.9)        |
|                                                                         |
| +---------------------------------------------------+ +---------------+ |
| |                                                   | | RightRail     | |
| |              GameBoard (Canvas 29:16)             | | - Category    | |
| |          Fills 100% of available height           | | - Action Cards| |
| |                                                   | | - End Turn    | |
| +---------------------------------------------------+ +---------------+ |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| Mode B: Desktops, Laptops, Tablets (height > 520px)                     |
|                                                                         |
| [ Top Edge: GameBoard Canvas anchored to Y=0, filling 100% width ]     |
| +---------------------------------------------------------------------+ |
| |                                                                     | |
| |                      GameBoard (Canvas 29:16)                       | |
| |                                                                     | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | Floating CommandConsole (Snap Heights: Peek=40px, Def=176px, Exp=320px)|
| | Header: [Year] [📰] [Turn] ----- [Drag Pill] ----- [₿ Sats] [Pop] [▲] |
| | Panels: [ Left: Tabs ]  [ Center: Action Cards ]  [ Right: Intel ]  | |
| +---------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+

```

- **Mode A (Short Displays / Phones)**: The map scales to the full vertical height of the device (`h-full aspect-[29/16]`), and thumb controls are pinned to a dedicated right-hand vertical rail (`RightRail.tsx`).
- **Mode B (Taller Displays / Desktop / Tablet)**: The top navigation bar is eliminated. The canvas pins directly to $Y=0$. The command center floats as an overlay across the southern sea with three snap positions:
- **Peek (`h-10` / 40px)**: Exposes southern sea lanes while keeping financial vitals and the newspaper button visible.
- **Default (`h-44` / 176px)**: Displays horizontal quick-build action cards.
- **Expanded (`h-80` / 320px)**: Surfaces the three-column dashboard (Categories, Detailed Specs, Tactical Intelligence).

---

## 4. Visual Rendering & Cartographic Specification

The map canvas executes on an internal buffer matching `rect.width * window.devicePixelRatio` to prevent blurriness on Retina displays.

### Layered Substrate Rendering Order

To eliminate edge visual artifacts when drawing rounded borders, each cell renders its underlying terrain before applying foreground shapes:

1. **Deep Sea (Rank 0)**: Base water fill (`#365569`).
2. **Coastal Shallows (Rank 1)**: Base deep sea fill $\rightarrow$ rounded shallows fill (`#5E93A3`).
3. **Island Soil (Rank 2)**: Base shallows fill $\rightarrow$ rounded parchment ground (`#F2E7CD`).
4. **Mountain Ridges (Rank 3)**: Base island soil fill $\rightarrow$ rounded stone fill (`#8A7968`).

```
Elevated Tile Rendering Hierarchy:
+-----------------------------------------------------------+
| Full Cell Fill: Lower-Tier Substrate                      |
|   +-----------------------------------------------------+ |
|   | ctx.roundRect(): Target Terrain                     | |
|   |   +-----------------------------------------------+ | |
|   |   | Decorative Overlay (Hachures / Stipples)      | | |
|   |   +-----------------------------------------------+ | |
|   +-----------------------------------------------------+ |
+-----------------------------------------------------------+

```

### Color Token Mapping

- **Deep Ocean**: `#365569`
- **Coastal Shallows**: `#5E93A3`
- **Parchment Soil**: `#F2E7CD`
- **Mountain Stone**: `#8A7968`
- **Faction Red (P1)**: `#C84630`
- **Faction Blue (P2)**: `#2B6CB0`
- **Bitcoin / Brass Accent**: `#E5A93C`
- **Plantation Green**: `#4E8752`
- **Bastion Slate**: `#566573`
- **Timber Structure**: `#8D5B4C`

---

## 5. Economic & Simulation Formulas

### Simulation Tick (Every 1.5s)

$$\text{Heading}(E) \in \{\text{North}, \text{South}, \text{East}, \text{West}, \text{Stationary}\}$$

- **Squalls**: Advance 1 tile every 3 ticks; mark plantations within cell as `isWatered = true`.
- **Tempests**: Advance 1 tile every 2 ticks; 50% probability per tick to sink overlapping vessels.
- **Fish Shoals**: Wander open water; advance 1 tile every 2 ticks.
- **Coastal Bastions**: Intercept and destroy `ROGUE_GALLEON` entities when:

$$\max(\vert{}x_{\text{bastion}} - x_{\text{galleon}}\vert{}, \vert{}y_{\text{bastion}} - y_{\text{galleon}}\vert{}) \le 1$$

### Turn-End Census Audit

1. **Food Balance**:

$$\text{Food}_{\text{harvest}} = \sum (\text{Plantation} \times 25) + \sum (\text{Watered Plantation} \times 50) + \sum (\text{Schooner} \times 15)$$

$$\text{Food}_{\text{demand}} = \left\lceil \frac{\text{Population}}{500} \right\rceil \times 20$$

$$\Delta \text{Food} = \text{Food}_{\text{current}} + \text{Food}_{\text{harvest}} - \text{Food}_{\text{demand}}$$

2. **Demographics**:

- If $\Delta \text{Food} \ge 0$: $\text{Population}_{t+1} = \lfloor\text{Population}_t \times 1.06\rfloor$
- If $\Delta \text{Food} < 0$: $\text{Population}_{t+1} = \lfloor\text{Population}_t \times 0.85\rfloor$ and $\text{Unrest} = \text{Unrest} + 25\%$

3. **Housing & Mutiny**:

- Capacity = $\sum (\text{Settler Quarters} \times 1000)$.
- Overcrowding Penalty: If $\text{Population} > \text{Capacity}$, $\text{Unrest} = \text{Unrest} + 15\%$.
- Medical Mitigation: Each Apothecary applies $\text{Unrest} = \text{Unrest} - 10\%$.
- Uprising Threshold: If $\text{Unrest} \ge 60\%$, spawn `CORSAIR_MUTINEER` on home island.

4. **Campaign Victory Score**:

$$\text{Score} = \left\lfloor\frac{\text{Pop}_{\text{final}}}{100}\right\rfloor + \left\lfloor\frac{\text{Treasury}_{\text{sats}}}{50}\right\rfloor + (\text{Structures} \times 10) + (\text{Raiders Sunk} \times 15)$$

---

## 6. Persistence & Offline Data Contract

All client persistence is managed in `IslecraftDB` via Dexie.js:

```typescript
export interface ActiveGameRecord {
  id: "current_session";
  turn: number;
  totalTurns: number;
  turnTimeRemaining: number;
  isPaused: boolean;
  gameMode: "SOLO" | "PASS_AND_PLAY";
  activeMapId: string;
  p1: FactionState;
  p2: FactionState;
  entities: DynamicEntity[];
  history: VitalSnapshot[];
  updatedAt: number;
}

export interface MatchHistoryRecord {
  id?: number;
  completedAt: string;
  mapId: string;
  gameMode: string;
  turnsCompleted: number;
  finalScore: number;
  rankTitle: string;
  p1FinalStats: {
    pop: number;
    treasury: number;
    structuresCount: number;
  };
}
```

- **Write Trigger**: Committed during turn rollovers, building placements, vessel maneuvers, and game conclusions via `useGamePersistence.ts`.
- **Hydration Gate**: The root application holds an `isHydrated` barrier. If `activeGame` exists in Dexie upon startup, the state initializes with saved board values rather than default starter constants.
