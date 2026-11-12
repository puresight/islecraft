export type WeatherType = 'SQUALL' | 'TEMPEST' | 'HURRICANE';

export type SeaEntityType = WeatherType | 'FISH_SHOAL' | 'ROGUE_GALLEON';

/** Width/height in grid cells of an entity's occupied area. */
export interface Footprint {
  w: number;
  h: number;
}

/**
 * Live, real-time world entity driven by the simulation heartbeat.
 * `(x, y)` anchors the top-left cell of the footprint; `phase` counts
 * heartbeat ticks since spawn and gates movement cadence.
 */
export interface DynamicEntity {
  id: string;
  type: SeaEntityType;
  x: number;
  y: number;
  /** 0 = drifting east, 180 = drifting west */
  direction: 0 | 180;
  phase: number;
  footprint: Footprint;
}
