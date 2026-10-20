import { useCallback, useEffect, useRef, useState } from 'react';
import { Building, BuildingType, Faction, GameStateSnapshot, UnitEntity, UnitType } from '@/types/game';
import { DynamicEntity, SeaEntityType } from '@/types/entities';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';
import { canPlaceItem, isBuildingType } from '@/utils/placementRules';
import type { BoardEffect } from '@/App';
import { BUILDING_SPEC, UNIT_SPEC } from '@/types/game';

const VESSEL_KINDS: UnitType[] = ['FISHING_SCHOONER', 'PRIVATEER_SLOOP'];

const PALETTE: Record<TileType, { fill: string; edge?: string }> = {
  [TileType.DEEP_SEA]: { fill: '#16262E' },
  [TileType.SHALLOW_WATER]: { fill: '#28444B' },
  [TileType.P1_TERRITORY]: { fill: '#D8C596', edge: '#B85D3D' },
  [TileType.P2_TERRITORY]: { fill: '#D8C596', edge: '#3A6B88' },
  [TileType.MOUNTAIN]: { fill: '#4D6B53' },
};

const GRID_LINE = 'rgba(255, 255, 255, 0.02)';

const FACTION_FILL: Record<Faction, string> = {
  player: '#B85D3D',
  rival: '#3A6B88',
};

const CURSOR = {
  valid: { stroke: '#34D399', fill: 'rgba(52, 211, 153, 0.22)' },
  invalid: { stroke: '#B85D3D', fill: 'rgba(184, 93, 61, 0.22)' },
  inspect: { stroke: 'rgba(238, 242, 255, 0.65)', fill: 'rgba(238, 242, 255, 0.10)' },
} as const;

const STRUCTURE_COLORS: Record<BuildingType, string> = {
  PLANTATION: '#8FAF68',
  COASTAL_BASTION: '#9FA8A3',
  TRADING_POST: '#D4A346',
  APOTHECARY: '#E07A5F',
  SETTLER_QUARTERS: '#A2703F',
};

const DYNAMIC_COLORS: Record<SeaEntityType, string> = {
  SQUALL: '#78909C',
  TEMPEST: '#B0BEC5',
  FISH_SHOAL: '#90A4AE',
  ROGUE_GALLEON: '#263238',
};

const TERRAIN_TOOLTIP: Record<TileType, string> = {
  [TileType.DEEP_SEA]: 'Deep Sea',
  [TileType.SHALLOW_WATER]: 'Coastal Shallows',
  [TileType.P1_TERRITORY]: 'Isle of Red',
  [TileType.P2_TERRITORY]: 'Isle of Cobalt',
  [TileType.MOUNTAIN]: 'Mountain Spine',
};

function tooltipFor(
  x: number,
  y: number,
  game: GameStateSnapshot,
  entities: DynamicEntity[],
): string {
  const tile = INITIAL_MAP[y]?.[x];
  const lines: string[] = [TERRAIN_TOOLTIP[tile] ?? 'Open Water'];

  const building = game.buildings.find((b) => b.col === x && b.row === y);
  if (building) {
    const name = BUILDING_SPEC[building.type].label;
    const note = building.type === 'COASTAL_BASTION' ? 'Cannon defense aura active' : BUILDING_SPEC[building.type].effect;
    lines.push(`${name} (${note})`);
  }

  const vessel = game.units.find((u) => u.faction === 'player' && u.col === x && u.row === y);
  if (vessel) lines.push(`${UNIT_SPEC[vessel.type].label} (Ready to steer)`);

  const entity = entities.find((e) => e.x === x && e.y === y);
  if (entity) {
    switch (entity.type) {
      case 'SQUALL':
        lines.push('Squall (Waters crops)');
        break;
      case 'TEMPEST':
        lines.push('Tempest (Dangerous gale)');
        break;
      case 'FISH_SHOAL':
        lines.push('Fish Shoal (50 Food available)');
        break;
      case 'ROGUE_GALLEON':
        lines.push('Rogue Galleon (Threat to civilian shipping)');
        break;
    }
  }

  const mutineer = game.units.find((u) => u.type === 'CORSAIR_MUTINEER' && u.col === x && u.row === y);
  if (mutineer) lines.push('Corsair Mutineer (Rabid rabble — quell with a bastion!)');

  return lines.join(' · ');
}

interface GameBoardProps {
  state: GameStateSnapshot;
  placementActive: boolean;
  activeFaction: Faction;
  selectedItem: BuildingType | UnitType | null;
  dynamicEntities: DynamicEntity[];
  selectedVesselId: string | null;
  effects: BoardEffect[];
  onCellTap: (col: number, row: number) => void;
  className?: string;
}

export function GameBoard({
  state,
  placementActive,
  activeFaction,
  selectedItem,
  dynamicEntities,
  selectedVesselId,
  effects,
  onCellTap,
  className = '',
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [tooltipText, setTooltipText] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const placementRef = useRef(placementActive);
  placementRef.current = placementActive;
  const factionRef = useRef(activeFaction);
  factionRef.current = activeFaction;
  const itemRef = useRef(selectedItem);
  itemRef.current = selectedItem;
  const hoverRef = useRef(hoveredTile);
  hoverRef.current = hoveredTile;
  const dynamicRef = useRef(dynamicEntities);
  dynamicRef.current = dynamicEntities;
  const vesselIdRef = useRef(selectedVesselId);
  vesselIdRef.current = selectedVesselId;
  const effectsRef = useRef(effects);
  effectsRef.current = effects;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellW = cssWidth / MAP_COLS;
    const cellH = cssHeight / MAP_ROWS;

    // Terrain — solid edge-to-edge fills for a seamless chart
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = INITIAL_MAP[row][col];
        const { fill, edge } = PALETTE[tile];
        const px = col * cellW;
        const py = row * cellH;
        ctx.fillStyle = fill;
        ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
        if (edge) {
          ctx.strokeStyle = edge;
          ctx.globalAlpha = 0.18;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Ultra-faint lat/long hairlines
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 1; col < MAP_COLS; col++) {
      ctx.moveTo(col * cellW, 0);
      ctx.lineTo(col * cellW, cssHeight);
    }
    for (let row = 1; row < MAP_ROWS; row++) {
      ctx.moveTo(0, row * cellH);
      ctx.lineTo(cssWidth, row * cellH);
    }
    ctx.stroke();

    const game = stateRef.current;
    const item = itemRef.current;
    const faction = factionRef.current;
    const active = placementRef.current && item !== null;

    // Vessel steering: brass compass reticle + navigable-water glow
    const vesselId = vesselIdRef.current;
    const selectedVessel = vesselId ? game.units.find((u) => u.id === vesselId) : undefined;
    const s0 = Math.min(cellW, cellH);
    if (selectedVessel) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = selectedVessel.col + dx;
          const ny = selectedVessel.row + dy;
          const tile = INITIAL_MAP[ny]?.[nx];
          if (tile === TileType.SHALLOW_WATER || tile === TileType.DEEP_SEA) {
            ctx.fillStyle = 'rgba(52, 211, 153, 0.20)';
            ctx.fillRect(nx * cellW, ny * cellH, cellW, cellH);
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(nx * cellW + 1, ny * cellH + 1, cellW - 2, cellH - 2);
            // Green directional indicator pointing toward the open water
            const ncx = (nx + 0.5) * cellW;
            const ncy = (ny + 0.5) * cellH;
            const angle = Math.atan2(ncy - (selectedVessel.row + 0.5) * cellH, ncx - (selectedVessel.col + 0.5) * cellW);
            ctx.save();
            ctx.translate(ncx, ncy);
            ctx.rotate(angle);
            ctx.fillStyle = '#34D399';
            ctx.globalAlpha = 0.55 + 0.45 * Math.sin(performance.now() / 280);
            ctx.beginPath();
            ctx.moveTo(s0 * 0.3, 0);
            ctx.lineTo(-s0 * 0.16, -s0 * 0.16);
            ctx.lineTo(-s0 * 0.16, s0 * 0.16);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }

    // Valid-placement field guide over home territory
    if (active && isBuildingType(item)) {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          if (canPlaceItem(item, col, row, faction, game).valid) {
            ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
          }
        }
      }
    }

    // Hover cursor: pulsating validity tint
    const hover = hoverRef.current;
    if (hover) {
      const cursorStyle = !active
        ? CURSOR.inspect
        : canPlaceItem(item as BuildingType | UnitType, hover.x, hover.y, faction, game).valid
          ? CURSOR.valid
          : CURSOR.invalid;
      const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
      const px = hover.x * cellW;
      const py = hover.y * cellH;
      ctx.fillStyle = cursorStyle.fill;
      ctx.fillRect(px, py, cellW, cellH);
      ctx.strokeStyle = cursorStyle.stroke;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);
      ctx.globalAlpha = 1;
    }

    game.buildings.forEach((b) => drawBuilding(ctx, b, cellW, cellH));
    game.units
      .filter((u) => u.faction !== 'neutral' || u.type === 'CORSAIR_MUTINEER')
      .forEach((u) => (u.type === 'CORSAIR_MUTINEER' ? drawMutineer(ctx, u, cellW, cellH) : drawUnit(ctx, u, cellW, cellH, u.id === vesselId)));
    // Live world entities pulse above everything
    dynamicRef.current.forEach((e) => drawDynamicEntity(ctx, e, cellW, cellH));

    // Effects: floating resource text + bastion cannon flashes
    const now = performance.now();
    effectsRef.current.forEach((fx) => {
      const age = (now - fx.born) / 1000;
      const t = Math.min(1, Math.max(0, age / 1.8));
      const px = (fx.x + 0.5) * cellW;
      const py = (fx.y + 0.5) * cellH;
      if (fx.kind === 'flash') {
        ctx.globalAlpha = Math.max(0, 1 - t * 2);
        ctx.fillStyle = fx.color;
        ctx.beginPath();
        ctx.arc(px, py, cellW * (0.3 + t * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.fillStyle = fx.color;
        ctx.font = `bold ${Math.max(10, cellH * 0.55)}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(fx.text ?? '', px, py - t * cellH * 1.6);
        ctx.globalAlpha = 1;
      }
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    draw();
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    const onEntities = () => draw();
    window.addEventListener('islecraft-entities-tick', onEntities);

    // Pulsation loop only while the pointer rests on the chart
    let raf = 0;
    if (hoveredTile) {
      const loop = () => {
        draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('islecraft-entities-tick', onEntities);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [draw, state, placementActive, selectedItem, activeFaction, hoveredTile, dynamicEntities, effects, selectedVesselId]);

  const tileFromEvent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const tileX = Math.floor(((clientX - rect.left) / rect.width) * MAP_COLS);
    const tileY = Math.floor(((clientY - rect.top) / rect.height) * MAP_ROWS);
    return {
      x: Math.min(MAP_COLS - 1, Math.max(0, tileX)),
      y: Math.min(MAP_ROWS - 1, Math.max(0, tileY)),
    };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === 'touch') return;
      const tile = tileFromEvent(e.clientX, e.clientY);
      setHoveredTile((prev) => (prev && tile && prev.x === tile.x && prev.y === tile.y ? prev : tile));
      setTooltipText(tile ? tooltipFor(tile.x, tile.y, stateRef.current, dynamicRef.current) : null);
      const canvas = canvasRef.current;
      if (canvas && tile) {
        const game = stateRef.current;
        const overVessel = game.units.some(
          (u) => u.faction === 'player' && u.col === tile.x && u.row === tile.y && VESSEL_KINDS.includes(u.type as never),
        );
        canvas.style.cursor = overVessel && !placementRef.current ? 'pointer' : placementRef.current ? 'crosshair' : 'default';
      }
    },
    [tileFromEvent],
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredTile(null);
    setTooltipText(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const tile = tileFromEvent(e.clientX, e.clientY);
      if (tile) onCellTap(tile.x, tile.y);
    },
    [onCellTap, tileFromEvent],
  );

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ touchAction: 'manipulation' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        role="grid"
        aria-label="Dual isle chart"
      />
      {hoveredTile && tooltipText && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-[240px] rounded-md border border-[#D4AF37]/50 bg-[#111A1F]/95 px-2 py-1 shadow-panel"
          style={{
            left: `min(calc(${(hoveredTile.x + 0.5) * (100 / MAP_COLS)}% + 12px), calc(100% - 12px))`,
            top: `min(calc(${(hoveredTile.y + 1) * (100 / MAP_ROWS)}% + 8px), calc(100% - 8px))`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="text-[10px] leading-snug text-[#D8C596]">{tooltipText}</p>
        </div>
      )}
    </div>
  );
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, cellW: number, cellH: number) {
  const cx = (b.col + 0.5) * cellW;
  const cy = (b.row + 0.5) * cellH;
  const s = Math.min(cellW, cellH) * 0.62;
  const color = STRUCTURE_COLORS[b.type] ?? '#8FA3A8';

  ctx.save();
  // Ground plate ties the glyph to its tile without hiding the terrain
  ctx.fillStyle = 'rgba(22, 38, 46, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.28, s * 0.42, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(22, 38, 46, 0.55)';
  ctx.lineWidth = 1;
  switch (b.type) {
    case 'PLANTATION': {
      // Bundled cane: three sprays fanned from a tie point
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(22, 38, 46, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.16, cy + s * 0.22);
      ctx.lineTo(cx + s * 0.16, cy - s * 0.2);
      ctx.moveTo(cx, cy + s * 0.24);
      ctx.lineTo(cx, cy - s * 0.22);
      ctx.moveTo(cx + s * 0.16, cy + s * 0.22);
      ctx.lineTo(cx - s * 0.16, cy - s * 0.2);
      ctx.stroke();
      break;
    }
    case 'COASTAL_BASTION': {
      // Crenellated tower
      const w = s * 0.56;
      const h = s * 0.6;
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      const mw = w / 5;
      for (let i = 0; i < 5; i += 2) {
        ctx.fillRect(cx - w / 2 + i * mw, cy - h / 2 - s * 0.1, mw, s * 0.1);
      }
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      break;
    }
    case 'TRADING_POST': {
      // Weigh scales: beam, pans, and a coin
      ctx.strokeStyle = 'rgba(22, 38, 46, 0.55)';
      ctx.lineWidth = Math.max(1.2, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.24);
      ctx.lineTo(cx, cy + s * 0.22);
      ctx.moveTo(cx - s * 0.26, cy - s * 0.16);
      ctx.lineTo(cx + s * 0.26, cy - s * 0.16);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - s * 0.26, cy - s * 0.08, s * 0.1, 0, Math.PI);
      ctx.arc(cx + s * 0.26, cy - s * 0.08, s * 0.1, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.06, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'APOTHECARY': {
      // Medical cross
      const arm = s * 0.11;
      ctx.fillRect(cx - arm, cy - s * 0.28, arm * 2, s * 0.56);
      ctx.fillRect(cx - s * 0.28, cy - arm, s * 0.56, arm * 2);
      break;
    }
    case 'SETTLER_QUARTERS': {
      // Gabled barracks roof
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.3);
      ctx.lineTo(cx + s * 0.32, cy + s * 0.08);
      ctx.lineTo(cx - s * 0.32, cy + s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - s * 0.22, cy + s * 0.08, s * 0.44, s * 0.2);
      break;
    }
  }
  ctx.restore();
}

function drawDynamicEntity(ctx: CanvasRenderingContext2D, e: DynamicEntity, cellW: number, cellH: number) {
  const cx = (e.x + 0.5) * cellW;
  const cy = (e.y + 0.5) * cellH;
  const s = Math.min(cellW, cellH);
  const dir = e.direction === 180 ? -1 : 1;

  ctx.save();
  switch (e.type) {
    case 'SQUALL': {
      // Soft cumulus silhouette
      ctx.fillStyle = DYNAMIC_COLORS.SQUALL;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(cx - s * 0.14, cy + s * 0.06, s * 0.15, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.02, cy - s * 0.06, s * 0.19, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.18, cy + s * 0.08, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'TEMPEST': {
      // Swirling vortex
      ctx.strokeStyle = DYNAMIC_COLORS.TEMPEST;
      ctx.lineWidth = Math.max(1.5, s * 0.07);
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.25) {
        const r = s * 0.06 + (a / (Math.PI * 4)) * s * 0.26;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case 'FISH_SHOAL': {
      // Cluster of small silver fish
      ctx.fillStyle = DYNAMIC_COLORS.FISH_SHOAL;
      const fish: Array<[number, number]> = [
        [-0.14, -0.08],
        [0.1, -0.12],
        [-0.02, 0.06],
        [0.16, 0.1],
      ];
      fish.forEach(([fx, fy]) => {
        const fxp = cx + fx * s;
        const fyp = cy + fy * s;
        ctx.beginPath();
        ctx.ellipse(fxp, fyp, s * 0.07, s * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(fxp - dir * s * 0.07, fyp);
        ctx.lineTo(fxp - dir * s * 0.11, fyp - s * 0.03);
        ctx.lineTo(fxp - dir * s * 0.11, fyp + s * 0.03);
        ctx.closePath();
        ctx.fill();
      });
      break;
    }
    case 'ROGUE_GALLEON': {
      // Black-sailed pirate ship
      ctx.fillStyle = DYNAMIC_COLORS.ROGUE_GALLEON;
      ctx.beginPath();
      ctx.moveTo(cx - dir * s * 0.2, cy + s * 0.12);
      ctx.lineTo(cx + dir * s * 0.2, cy + s * 0.12);
      ctx.lineTo(cx + dir * s * 0.11, cy + s * 0.24);
      ctx.lineTo(cx - dir * s * 0.13, cy + s * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.28);
      ctx.lineTo(cx, cy + s * 0.12);
      ctx.lineTo(cx + dir * s * 0.22, cy + s * 0.03);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawUnit(ctx: CanvasRenderingContext2D, u: UnitEntity, cellW: number, cellH: number, selected = false) {
  const cx = (u.col + 0.5) * cellW;
  const cy = (u.row + 0.5) * cellH;
  const s = Math.min(cellW, cellH);
  const dir = u.heading === 180 ? -1 : 1;

  ctx.save();
  switch (u.type) {
    case 'SQUALL':
    case 'TEMPEST': {
      ctx.strokeStyle = u.type === 'TEMPEST' ? 'rgba(214, 222, 226, 0.85)' : 'rgba(214, 222, 226, 0.6)';
      ctx.lineWidth = Math.max(1.5, s * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy, s * (u.type === 'TEMPEST' ? 0.3 : 0.22), Math.PI * 0.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    }
    case 'FISH_SHOAL': {
      ctx.fillStyle = 'rgba(220, 228, 230, 0.75)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.2, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - dir * s * 0.2, cy);
      ctx.lineTo(cx - dir * s * 0.3, cy - s * 0.08);
      ctx.lineTo(cx - dir * s * 0.3, cy + s * 0.08);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: {
      // Vessels: crisp hull + sail, tinted to faction
      const hullColor = FACTION_FILL[u.faction as Faction] ?? '#8FA3A8';
      ctx.fillStyle = hullColor;
      ctx.beginPath();
      ctx.moveTo(cx - dir * s * 0.2, cy + s * 0.12);
      ctx.lineTo(cx + dir * s * 0.2, cy + s * 0.12);
      ctx.lineTo(cx + dir * s * 0.11, cy + s * 0.24);
      ctx.lineTo(cx - dir * s * 0.13, cy + s * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(22, 38, 46, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (selected) {
        // Pulsing brass compass ring
        const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 250);
        ctx.strokeStyle = '#D4AF37';
        ctx.globalAlpha = pulse;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        // Cardinal tick marks
        [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((a) => {
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * s * 0.36, cy + Math.sin(a) * s * 0.36);
          ctx.lineTo(cx + Math.cos(a) * s * 0.48, cy + Math.sin(a) * s * 0.48);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.28);
      ctx.lineTo(cx, cy + s * 0.12);
      ctx.lineTo(cx + dir * s * 0.22, cy + s * 0.03);
      ctx.closePath();
      ctx.fillStyle = 'rgba(238, 228, 208, 0.85)';
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawMutineer(ctx: CanvasRenderingContext2D, u: UnitEntity, cellW: number, cellH: number) {
  const cx = (u.col + 0.5) * cellW;
  const cy = (u.row + 0.5) * cellH;
  const s = Math.min(cellW, cellH);

  ctx.save();
  // Ominous red menace aura
  const menace = 0.5 + 0.5 * Math.sin(performance.now() / 320);
  ctx.fillStyle = 'rgba(184, 93, 61, 0.25)';
  ctx.beginPath();
  ctx.arc(cx, cy, s * (0.36 + menace * 0.06), 0, Math.PI * 2);
  ctx.fill();

  // Crossed black cutlasses
  ctx.strokeStyle = '#1A1210';
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.18);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.14);
  ctx.moveTo(cx + s * 0.2, cy - s * 0.18);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.14);
  ctx.stroke();

  // Skull-and-torch centerpiece
  ctx.fillStyle = '#B85D3D';
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.02, s * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E8D8A0';
  ctx.fillRect(cx - s * 0.05, cy + s * 0.05, s * 0.1, s * 0.05);
  ctx.restore();
}
