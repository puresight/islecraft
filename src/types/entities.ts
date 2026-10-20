export type WeatherType = 'SQUALL' | 'TEMPEST';

export type SeaEntityType = WeatherType | 'FISH_SHOAL' | 'ROGUE_GALLEON';

/**
 * Live, real-time world entity driven by the simulation heartbeat.
 * `phase` counts heartbeat ticks since spawn and gates movement cadence.
 */
export interface DynamicEntity {
  id: string;
  type: SeaEntityType;
  x: number;
  y: number;
  /** 0 = drifting east, 180 = drifting west */
  direction: 0 | 180;
  phase: number;
}
