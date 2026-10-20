import { useCallback, useEffect, useRef, useState } from 'react';
import { Building, BuildingType, Faction, GameStateSnapshot, UnitEntity, UnitType } from '@/types/game';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';
import { canPlaceItem, isBuildingType } from '@/utils/placementRules';

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

interface GameBoardProps {
  state: GameStateSnapshot;
  placementActive: boolean;
  activeFaction: Faction;
  selectedItem: BuildingType | UnitType | null;
  onCellTap: (col: number, row: number) => void;
  className?: string;
}

export function GameBoard({
  state,
  placementActive,
  activeFaction,
  selectedItem,
  onCellTap,
  className = '',
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

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
    game.units.forEach((u) => drawUnit(ctx, u, cellW, cellH));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    draw();
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    const onResize = () => draw();
    window.addEventListener('resize', onResize);

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
      if (raf) cancelAnimationFrame(raf);
    };
  }, [draw, state, placementActive, selectedItem, activeFaction, hoveredTile]);

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
    },
    [tileFromEvent],
  );

  const handlePointerLeave = useCallback(() => setHoveredTile(null), []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const tile = tileFromEvent(e.clientX, e.clientY);
      if (tile) onCellTap(tile.x, tile.y);
    },
    [onCellTap, tileFromEvent],
  );

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${placementActive ? 'cursor-crosshair' : 'cursor-pointer'} ${className}`}
      style={{ touchAction: 'manipulation' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      role="grid"
      aria-label="Dual isle chart"
    />
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

function drawUnit(ctx: CanvasRenderingContext2D, u: UnitEntity, cellW: number, cellH: number) {
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
