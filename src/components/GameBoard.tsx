import { useCallback, useEffect, useRef, useState } from 'react';
import { BuildingType, Faction, GameStateSnapshot, UnitType } from '@/types/game';
import { DynamicEntity } from '@/types/entities';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';
import { canPlaceItem } from '@/utils/placementRules';
import { isBuildingType, BUILDING_BLUEPRINTS, UNIT_BLUEPRINTS } from '@/constants/blueprints';
import { renderSprite, SpriteType } from '@/utils/spriteRenderer';
import { projectToTile, type GridCoord } from '@/utils/coordinates';
import type { BoardEffect } from '@/App';

const VESSEL_KINDS: UnitType[] = ['FISHING_SCHOONER', 'PRIVATEER_SLOOP'];

const PALETTE: Record<TileType, { fill: string }> = {
  [TileType.DEEP_SEA]: { fill: '#365569' },
  [TileType.SHALLOW_WATER]: { fill: '#5E93A3' },
  [TileType.P1_TERRITORY]: { fill: '#F2E7CD' },
  [TileType.P2_TERRITORY]: { fill: '#F2E7CD' },
  [TileType.MOUNTAIN]: { fill: '#8A7968' },
};

const GRID_LINE = 'rgba(255, 255, 255, 0.08)';
const SURF_LINE = 'rgba(255, 255, 255, 0.22)';
const LAND_EDGE_DARK = 'rgba(0, 0, 0, 0.12)';
const LAND_EDGE_LIGHT = 'rgba(255, 255, 255, 0.4)';
const WAVE_ARC = 'rgba(255, 255, 255, 0.07)';
const STIPPLE = '#C8B993';
const MOUNTAIN_RIDGE = 'rgba(255, 255, 255, 0.35)';

const CURSOR = {
  valid: { stroke: '#34D399', fill: 'rgba(52, 211, 153, 0.22)' },
  invalid: { stroke: '#C84630', fill: 'rgba(200, 70, 48, 0.22)' },
  inspect: { stroke: 'rgba(248, 250, 252, 0.75)', fill: 'rgba(248, 250, 252, 0.12)' },
} as const;

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
    const name = BUILDING_BLUEPRINTS[building.type].label;
    const note = building.type === 'COASTAL_BASTION' ? 'Cannon defense aura active' : BUILDING_BLUEPRINTS[building.type].effect;
    lines.push(`${name} (${note})`);
  }

  const vessel = game.units.find((u) => u.faction === 'player' && u.col === x && u.row === y);
  if (vessel) lines.push(`${UNIT_BLUEPRINTS[vessel.type].label} (Ready to steer)`);

  const entity = entities.find((e) => e.x === x && e.y === y);
  if (entity) {
    switch (entity.type) {
      case 'SQUALL':
        lines.push('Squall (Waters crops across 2 tiles)');
        break;
      case 'TEMPEST':
        lines.push('Tempest (Waters crops, may sink vessels across 4 tiles)');
        break;
      case 'HURRICANE':
        lines.push('Hurricane (Shatters vessels and unsheltered shores across 4 tiles)');
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

/**
 * The chart is a strict renderer and intent emitter: it reads `state` and
 * `dynamicEntities` and calls `onSelectTile` / `onCancel`. No simulation, no
 * data I/O, no state mutation.
 */
export interface GameBoardProps {
  state: GameStateSnapshot;
  placementActive: boolean;
  activeFaction: Faction;
  selectedItem: BuildingType | UnitType | null;
  dynamicEntities: DynamicEntity[];
  selectedVesselId: string | null;
  effects: BoardEffect[];
  onSelectTile: (col: number, row: number) => void;
  onCancel: () => void;
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
  onSelectTile,
  onCancel,
  className = '',
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTile, setHoveredTile] = useState<GridCoord | null>(null);
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
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

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

    const rankAt = (col: number, row: number): number => {
      const t = INITIAL_MAP[row]?.[col];
      if (t === undefined) return 0;
      if (t === TileType.SHALLOW_WATER) return 1;
      if (t === TileType.MOUNTAIN) return 3;
      if (t === TileType.P1_TERRITORY || t === TileType.P2_TERRITORY) return 2;
      return 0;
    };
    const isLand = (col: number, row: number) => rankAt(col, row) >= 2;

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = INITIAL_MAP[row][col];
        const rank = rankAt(col, row);
        const px = col * cellW;
        const py = row * cellH;

        if (rank === 0) {
          ctx.fillStyle = PALETTE[tile].fill;
          ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
        } else {
          const r = Math.min(cellW, cellH) * 0.38;
          const n = rankAt(col, row - 1);
          const so = rankAt(col, row + 1);
          const w = rankAt(col - 1, row);
          const e = rankAt(col + 1, row);
          const rTL = n < rank && w < rank ? r : 0;
          const rTR = n < rank && e < rank ? r : 0;
          const rBR = so < rank && e < rank ? r : 0;
          const rBL = so < rank && w < rank ? r : 0;

          if (rank === 3) {
            ctx.fillStyle = PALETTE[TileType.P1_TERRITORY].fill;
            ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
            const hsh = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
            const rnd = hsh - Math.floor(hsh);
            ctx.fillStyle = STIPPLE;
            const cnt = 3 + Math.floor(rnd * 2);
            for (let i = 0; i < cnt; i++) {
              const h2 = Math.sin((col + i * 3.7) * 12.9898 + (row - i * 2.3) * 78.233) * 43758.5453;
              const r2 = h2 - Math.floor(h2);
              const h3 = Math.sin((col - i * 5.1) * 39.3468 + (row + i * 1.9) * 11.135) * 24634.6345;
              const r3 = h3 - Math.floor(h3);
              ctx.fillRect(px + cellW * (0.12 + r2 * 0.76), py + cellH * (0.12 + r3 * 0.76), 1.4, 1.4);
            }
          } else if (rank === 2) {
            ctx.fillStyle = PALETTE[TileType.SHALLOW_WATER].fill;
            ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
          } else {
            ctx.fillStyle = PALETTE[TileType.DEEP_SEA].fill;
            ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
          }

          ctx.fillStyle = PALETTE[tile].fill;
          ctx.beginPath();
          ctx.roundRect(px, py, cellW + 0.5, cellH + 0.5, [rTL, rTR, rBR, rBL]);
          ctx.fill();

          if (tile === TileType.SHALLOW_WATER) {
            ctx.strokeStyle = SURF_LINE;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (isLand(col, row - 1)) {
              ctx.moveTo(px + rTL, py + 1);
              ctx.lineTo(px + cellW - rTR, py + 1);
            }
            if (isLand(col, row + 1)) {
              ctx.moveTo(px + rBL, py + cellH - 1);
              ctx.lineTo(px + cellW - rBR, py + cellH - 1);
            }
            if (isLand(col - 1, row)) {
              ctx.moveTo(px + 1, py + rTL);
              ctx.lineTo(px + 1, py + cellH - rBL);
            }
            if (isLand(col + 1, row)) {
              ctx.moveTo(px + cellW - 1, py + rTR);
              ctx.lineTo(px + cellW - 1, py + cellH - rBR);
            }
            ctx.stroke();
          } else {
            ctx.strokeStyle = LAND_EDGE_LIGHT;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 0.5, py + cellH - rBL);
            ctx.lineTo(px + 0.5, py + rTL);
            ctx.quadraticCurveTo(px + 0.5, py + 0.5, px + rTL, py + 0.5);
            ctx.lineTo(px + cellW - rTR, py + 0.5);
            ctx.stroke();
            ctx.strokeStyle = LAND_EDGE_DARK;
            ctx.beginPath();
            ctx.moveTo(px + cellW, py + rTR);
            ctx.quadraticCurveTo(px + cellW, py + cellH, px + cellW - rBR, py + cellH);
            ctx.lineTo(px + rBL, py + cellH);
            ctx.stroke();
          }
        }

        const hash = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
        const rand = hash - Math.floor(hash);
        if (rank === 0 && rand < 0.4) {
          ctx.strokeStyle = WAVE_ARC;
          ctx.lineWidth = 1;
          const cxw = px + cellW * (0.3 + rand * 0.4);
          const cyw = py + cellH * (0.35 + rand * 0.3);
          const aw = cellW * 0.22;
          ctx.beginPath();
          ctx.arc(cxw, cyw, aw, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
          if (rand < 0.2) {
            ctx.beginPath();
            ctx.arc(cxw + aw * 1.3, cyw + cellH * 0.18, aw * 0.8, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
          }
        } else if (rank === 2) {
          ctx.fillStyle = STIPPLE;
          const count = 3 + Math.floor(rand * 2);
          for (let i = 0; i < count; i++) {
            const h2 = Math.sin((col + i * 3.7) * 12.9898 + (row - i * 2.3) * 78.233) * 43758.5453;
            const r2 = h2 - Math.floor(h2);
            const h3 = Math.sin((col - i * 5.1) * 39.3468 + (row + i * 1.9) * 11.135) * 24634.6345;
            const r3 = h3 - Math.floor(h3);
            ctx.fillRect(px + cellW * (0.12 + r2 * 0.76), py + cellH * (0.12 + r3 * 0.76), 1.4, 1.4);
          }
        } else if (rank === 3) {
          const peaks = 2 + (rand < 0.5 ? 1 : 0);
          const peakHeight = Math.min(cellW, cellH) * 0.28;
          const peakHalfWidth = peakHeight * 0.75;
          for (let i = 0; i < peaks; i++) {
            const h2 = Math.sin((col + i * 7.31) * 12.9898 + (row + i * 3.17) * 78.233) * 43758.5453;
            const r2 = h2 - Math.floor(h2);
            const h3 = Math.sin((col - i * 2.53) * 39.3468 + (row + i * 4.71) * 11.135) * 24634.6345;
            const r3 = h3 - Math.floor(h3);
            const jitter = r3 * cellH * 0.08;
            const pcx = px + cellW * (0.25 + ((r2 * 0.5 + i * 0.23) % 0.55));
            const baseline = py + cellH * 0.75 - i * cellH * 0.06 - jitter;
            ctx.strokeStyle = MOUNTAIN_RIDGE;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pcx - peakHalfWidth, baseline);
            ctx.lineTo(pcx, baseline - peakHeight);
            ctx.stroke();
            ctx.strokeStyle = '#4A3F35';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(pcx, baseline - peakHeight);
            ctx.lineTo(pcx + peakHalfWidth, baseline);
            ctx.stroke();
          }
        }
      }
    }

    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 1; col < MAP_COLS; col++) {
      ctx.moveTo(col * cellW + 0.5, 0);
      ctx.lineTo(col * cellW + 0.5, cssHeight);
    }
    for (let row = 1; row < MAP_ROWS; row++) {
      ctx.moveTo(0, row * cellH + 0.5);
      ctx.lineTo(cssWidth, row * cellH + 0.5);
    }
    ctx.stroke();

    const game = stateRef.current;
    const item = itemRef.current;
    const faction = factionRef.current;
    const active = placementRef.current && item !== null;

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

    const hover = hoverRef.current;
    if (hover) {
      const cursorStyle = !active
        ? CURSOR.inspect
        : canPlaceItem(item as BuildingType | UnitType, hover.col, hover.row, faction, game).valid
          ? CURSOR.valid
          : CURSOR.invalid;
      const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
      const px = hover.col * cellW;
      const py = hover.row * cellH;
      ctx.fillStyle = cursorStyle.fill;
      ctx.fillRect(px, py, cellW, cellH);
      ctx.strokeStyle = cursorStyle.stroke;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);
      ctx.globalAlpha = 1;
    }

    const spriteSize = Math.min(cellW, cellH) * 0.85;
    game.buildings.forEach((b) =>
      renderSprite(
        ctx,
        b.type,
        b.col * cellW + (cellW - spriteSize) / 2,
        b.row * cellH + (cellH - spriteSize) / 2,
        spriteSize,
      ),
    );
    game.units
      .filter((u) => u.faction !== 'neutral' || u.type === 'CORSAIR_MUTINEER')
      .forEach((u) => {
        if (u.type === 'CORSAIR_MUTINEER') {
          const aura = 0.2 + 0.08 * Math.sin(performance.now() / 320);
          const ux = u.col * cellW + (cellW - spriteSize) / 2;
          const uy = u.row * cellH + (cellH - spriteSize) / 2;
          ctx.fillStyle = `rgba(200, 70, 48, ${aura})`;
          ctx.beginPath();
          ctx.arc(ux + spriteSize / 2, uy + spriteSize / 2, spriteSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
          renderSprite(ctx, 'CORSAIR_MUTINEER', ux, uy, spriteSize);
          return;
        }
        const selected = u.id === vesselId;
        if (selected) {
          const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 250);
          const cx = (u.col + 0.5) * cellW;
          const cy = (u.row + 0.5) * cellH;
          ctx.strokeStyle = '#F59E0B';
          ctx.globalAlpha = pulse;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(cellW, cellH) * 0.42, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const type: SpriteType =
          u.type === 'SQUALL' ? 'SQUALL' : u.type === 'TEMPEST' ? 'TEMPEST' : u.type === 'FISH_SHOAL' ? 'FISH_SHOAL' : u.type;
        renderSprite(
          ctx,
          type,
          u.col * cellW + (cellW - spriteSize) / 2,
          u.row * cellH + (cellH - spriteSize) / 2,
          spriteSize,
          { faction: u.faction === 'rival' ? 'P2' : 'P1' },
        );
      });
    dynamicRef.current.forEach((e) => {
      if (e.type === 'SQUALL' || e.type === 'TEMPEST' || e.type === 'HURRICANE') {
        const px = e.x * cellW;
        const py = e.y * cellH;
        const w = e.footprint.w * cellW;
        const h = e.footprint.h * cellH;
        renderSprite(ctx, e.type, px, py, w, {}, h);
        return;
      }
      renderSprite(
        ctx,
        e.type,
        e.x * cellW + (cellW - spriteSize) / 2,
        e.y * cellH + (cellH - spriteSize) / 2,
        spriteSize,
      );
    });

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

  // Redraw on state changes and whenever the pulsing hover/animation asks us to.
  useEffect(() => {
    draw();
  }, [draw, state, placementActive, selectedItem, activeFaction, hoveredTile, dynamicEntities, effects, selectedVesselId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    const onResize = () => draw();
    window.addEventListener('resize', onResize);

    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [draw]);

  const tileFromEvent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return projectToTile(clientX, clientY, canvas.getBoundingClientRect());
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === 'touch') return;
      const tile = tileFromEvent(e.clientX, e.clientY);
      setHoveredTile((prev) => (prev && tile && prev.col === tile.col && prev.row === tile.row ? prev : tile));
      setTooltipText(tile ? tooltipFor(tile.col, tile.row, stateRef.current, dynamicRef.current) : null);
      const canvas = canvasRef.current;
      if (canvas && tile) {
        const overVessel = stateRef.current.units.some(
          (u) => u.faction === 'player' && u.col === tile.col && u.row === tile.row && VESSEL_KINDS.includes(u.type),
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
      if (tile) onSelectTile(tile.col, tile.row);
    },
    [onSelectTile, tileFromEvent],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      cancelRef.current();
    },
    [],
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
        onContextMenu={handleContextMenu}
        role="grid"
        aria-label="Dual isle chart"
      />
      {hoveredTile && tooltipText && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-[240px] rounded-md border border-[#F59E0B]/50 bg-[#24333C]/95 px-2 py-1 shadow-panel"
          style={{
            left: `min(calc(${(hoveredTile.col + 0.5) * (100 / MAP_COLS)}% + 12px), calc(100% - 12px))`,
            top: `min(calc(${(hoveredTile.row + 1) * (100 / MAP_ROWS)}% + 8px), calc(100% - 8px))`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="text-[10px] leading-snug text-[#F8FAFC]">{tooltipText}</p>
        </div>
      )}
    </div>
  );
}
