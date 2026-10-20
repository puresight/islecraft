import { useCallback, useEffect, useRef } from 'react';
import { Building, BuildingType, GameStateSnapshot, UnitEntity } from '@/types/game';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';

const PALETTE: Record<TileType, { fill: string; edge?: string }> = {
  [TileType.DEEP_SEA]: { fill: '#16262E' },
  [TileType.SHALLOW_WATER]: { fill: '#28444B' },
  [TileType.P1_TERRITORY]: { fill: '#D8C596', edge: '#B85D3D' },
  [TileType.P2_TERRITORY]: { fill: '#D8C596', edge: '#3A6B88' },
  [TileType.MOUNTAIN]: { fill: '#4D6B53' },
};

const GRID_LINE = 'rgba(255, 255, 255, 0.02)';

const FACTION_FILL: Record<string, string> = {
  player: '#B85D3D',
  rival: '#3A6B88',
  neutral: '#8FA3A8',
};

interface GameBoardProps {
  state: GameStateSnapshot;
  placementActive: boolean;
  onCellTap: (col: number, row: number) => void;
  className?: string;
}

export function GameBoard({ state, placementActive, onCellTap, className = '' }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const placementRef = useRef(placementActive);
  placementRef.current = placementActive;

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

    // Terrain
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = INITIAL_MAP[row][col];
        const { fill, edge } = PALETTE[tile];
        const px = col * cellW;
        const py = row * cellH;
        if (edge) {
          // Land tiles: solid edge-to-edge fill; a subtle tint distinguishes the two isles
          ctx.fillStyle = fill;
          ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
          ctx.strokeStyle = edge;
          ctx.globalAlpha = 0.18;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = fill;
          ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    // Lat/long grid lines
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
    const occupantAt = new Set<string>();
    game.buildings.forEach((b) => occupantAt.add(`${b.col},${b.row}`));
    game.units.forEach((u) => occupantAt.add(`${u.col},${u.row}`));

    // Placement highlight on open P1 soil
    if (placementRef.current) {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.28)';
      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          if (INITIAL_MAP[row][col] !== TileType.P1_TERRITORY) continue;
          if (occupantAt.has(`${col},${row}`)) continue;
          ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
        }
      }
    }

    // Buildings
    game.buildings.forEach((b) => drawBuilding(ctx, b, cellW, cellH));
    // Units
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
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [draw, state, placementActive]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const point =
        'touches' in e
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: e.clientX, y: e.clientY };
      const col = Math.floor(((point.x - rect.left) / rect.width) * MAP_COLS);
      const row = Math.floor(((point.y - rect.top) / rect.height) * MAP_ROWS);
      if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) onCellTap(col, row);
    },
    [onCellTap],
  );

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${placementActive ? 'cursor-crosshair' : ''} ${className}`}
      style={{ touchAction: 'manipulation' }}
      onClick={handleTap}
      role="grid"
      aria-label="Dual isle chart"
    />
  );
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, cellW: number, cellH: number) {
  const pad = Math.min(cellW, cellH) * 0.16;
  const x = b.col * cellW + pad;
  const y = b.row * cellH + pad;
  const w = cellW - pad * 2;
  const h = cellH - pad * 2;
  const r = Math.min(w, h) * 0.22;

  ctx.fillStyle = FACTION_FILL[b.faction] ?? FACTION_FILL.neutral;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  ctx.strokeStyle = 'rgba(22, 38, 46, 0.55)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();

  // Inner glyph per building type
  ctx.fillStyle = 'rgba(238, 228, 208, 0.92)';
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = Math.min(w, h);
  ctx.beginPath();
  switch (b.type as BuildingType) {
    case 'PLANTATION':
      ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - s * 0.04, cy, s * 0.08, s * 0.2);
      break;
    case 'TRADING_POST':
      ctx.moveTo(cx, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.18, cy + s * 0.16);
      ctx.lineTo(cx - s * 0.18, cy + s * 0.16);
      ctx.closePath();
      ctx.fill();
      break;
    case 'SETTLER_QUARTERS':
      ctx.rect(cx - s * 0.16, cy - s * 0.1, s * 0.32, s * 0.24);
      ctx.fill();
      break;
    case 'COASTAL_BASTION':
      ctx.rect(cx - s * 0.18, cy - s * 0.06, s * 0.36, s * 0.18);
      ctx.fill();
      ctx.fillRect(cx - s * 0.12, cy - s * 0.16, s * 0.06, s * 0.1);
      ctx.fillRect(cx + s * 0.06, cy - s * 0.16, s * 0.06, s * 0.1);
      break;
    case 'APOTHECARY':
      ctx.rect(cx - s * 0.05, cy - s * 0.16, s * 0.1, s * 0.32);
      ctx.fill();
      ctx.rect(cx - s * 0.16, cy - s * 0.05, s * 0.32, s * 0.1);
      ctx.fill();
      break;
  }
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
      // Sailing vessels: hull + sail
      const fill = FACTION_FILL[u.faction] ?? FACTION_FILL.neutral;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(cx - dir * s * 0.18, cy + s * 0.1);
      ctx.lineTo(cx + dir * s * 0.18, cy + s * 0.1);
      ctx.lineTo(cx + dir * s * 0.1, cy + s * 0.2);
      ctx.lineTo(cx - dir * s * 0.12, cy + s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.26);
      ctx.lineTo(cx, cy + s * 0.1);
      ctx.lineTo(cx + dir * s * 0.2, cy + s * 0.02);
      ctx.closePath();
      ctx.fillStyle = u.type === 'ROGUE_GALLEON' ? 'rgba(238, 228, 208, 0.9)' : 'rgba(238, 228, 208, 0.75)';
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
