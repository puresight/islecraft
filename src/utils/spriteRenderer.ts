export type SpriteType =
  | 'PLANTATION'
  | 'COASTAL_BASTION'
  | 'TRADING_POST'
  | 'APOTHECARY'
  | 'SETTLER_QUARTERS'
  | 'FISHING_SCHOONER'
  | 'PRIVATEER_SLOOP'
  | 'ROGUE_GALLEON'
  | 'FISH_SHOAL'
  | 'SQUALL'
  | 'TEMPEST'
  | 'CORSAIR_MUTINEER';

export type SpriteFaction = 'P1' | 'P2';

export interface SpriteOptions {
  faction?: SpriteFaction;
  isWatered?: boolean;
}

const OUTLINE = 'rgba(15, 23, 32, 0.55)';

const FACTION_COLORS: Record<SpriteFaction, string> = {
  P1: '#C84630',
  P2: '#2B6CB0',
};

function pathStroke(ctx: CanvasRenderingContext2D, lineWidth: number) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/**
 * Draws a vector sprite. (x, y) is the top-left of a square size×size box;
 * callers center that box inside the target tile.
 */
export function renderSprite(
  ctx: CanvasRenderingContext2D,
  type: SpriteType,
  x: number,
  y: number,
  size: number,
  options: SpriteOptions = {},
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const s = size;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (type) {
    case 'PLANTATION':
      drawPlantation(ctx, cx, cy, s, options.isWatered ?? false);
      break;
    case 'COASTAL_BASTION':
      drawBastion(ctx, cx, cy, s);
      break;
    case 'TRADING_POST':
      drawTradingPost(ctx, cx, cy, s);
      break;
    case 'APOTHECARY':
      drawApothecary(ctx, cx, cy, s);
      break;
    case 'SETTLER_QUARTERS':
      drawQuarters(ctx, cx, cy, s);
      break;
    case 'FISHING_SCHOONER':
      drawSchooner(ctx, cx, cy, s);
      break;
    case 'PRIVATEER_SLOOP':
      drawSloop(ctx, cx, cy, s, options.faction ?? 'P1');
      break;
    case 'ROGUE_GALLEON':
      drawGalleon(ctx, cx, cy, s);
      break;
    case 'FISH_SHOAL':
      drawFishShoal(ctx, cx, cy, s);
      break;
    case 'SQUALL':
      drawSquall(ctx, cx, cy, s);
      break;
    case 'TEMPEST':
      drawTempest(ctx, cx, cy, s);
      break;
    case 'CORSAIR_MUTINEER':
      drawMutineer(ctx, cx, cy, s);
      break;
  }

  ctx.restore();
}

function shadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.fillStyle = 'rgba(15, 23, 32, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.34, s * 0.32, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlantation(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, watered: boolean) {
  shadow(ctx, cx, cy, s);
  const stalks: Array<[number, number]> = [
    [-0.16, 0.06],
    [0, -0.02],
    [0.16, 0.06],
  ];
  stalks.forEach(([ox, oy]) => {
    const baseX = cx + ox * s;
    const baseY = cy + s * 0.26;
    const tipX = cx + ox * s * 0.55;
    const tipY = cy + oy * s - s * 0.1;
    ctx.strokeStyle = '#3E6E42';
    ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + ox * s * 0.1, (baseY + tipY) / 2, tipX, tipY);
    ctx.stroke();
    // Curved drooping blades fanning from the tip
    ctx.strokeStyle = '#4E8752';
    ctx.lineWidth = Math.max(1, s * 0.055);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(
        tipX + i * s * 0.12,
        tipY + s * 0.06,
        tipX + i * s * 0.18,
        tipY + s * 0.16,
      );
      ctx.stroke();
    }
  });
  if (watered) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
    [[-0.14, 0.14], [0.02, 0.06], [0.16, 0.16]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.arc(cx + ox * s, cy + oy * s, Math.max(0.8, s * 0.022), 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function drawBastion(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  shadow(ctx, cx, cy, s);
  const w = s * 0.6;
  const h = s * 0.52;
  const left = cx - w / 2;
  const top = cy - h / 2 - s * 0.04;
  // Masonry block
  ctx.fillStyle = '#566573';
  ctx.fillRect(left, top, w, h);
  pathStroke(ctx, 1);
  // 3 top crenellations
  ctx.fillStyle = '#4A5966';
  const mw = w / 5;
  for (let i = 0; i < 5; i += 2) {
    ctx.fillRect(left + i * mw, top - s * 0.09, mw, s * 0.09);
  }
  // Masonry joints
  ctx.strokeStyle = 'rgba(15, 23, 32, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top + h * 0.4);
  ctx.lineTo(left + w, top + h * 0.4);
  ctx.moveTo(left + w * 0.34, top + h * 0.4);
  ctx.lineTo(left + w * 0.34, top + h);
  ctx.moveTo(left + w * 0.67, top + h * 0.4);
  ctx.lineTo(left + w * 0.67, top + h);
  ctx.stroke();
  // Dark arrow slit
  ctx.fillStyle = '#101820';
  ctx.fillRect(cx - s * 0.035, top + s * 0.08, s * 0.07, s * 0.16);
  // Brass cannon barrel pointing seaward (right)
  ctx.fillStyle = '#E5A93C';
  ctx.fillRect(cx + w / 2 - s * 0.02, top + h * 0.62, s * 0.24, s * 0.06);
  ctx.beginPath();
  ctx.arc(cx + w / 2 + s * 0.22, top + h * 0.62 + s * 0.03, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
}

function drawTradingPost(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  shadow(ctx, cx, cy, s);
  const w = s * 0.62;
  const h = s * 0.4;
  const left = cx - w / 2;
  const top = cy + s * 0.08;
  // Cedar body
  ctx.fillStyle = '#8D5B4C';
  ctx.fillRect(left, top, w, h);
  pathStroke(ctx, 1);
  // Pitched shingle roof
  ctx.fillStyle = '#6E4538';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.62, top);
  ctx.lineTo(cx, top - s * 0.26);
  ctx.lineTo(cx + w * 0.62, top);
  ctx.closePath();
  ctx.fill();
  pathStroke(ctx, 1);
  // Shingle lines
  ctx.strokeStyle = 'rgba(15, 23, 32, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.31, top - s * 0.13);
  ctx.lineTo(cx + w * 0.31, top - s * 0.13);
  ctx.stroke();
  // Brass coin emblem on the front wall
  ctx.fillStyle = '#E5A93C';
  ctx.beginPath();
  ctx.arc(cx, top + h * 0.48, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(15, 23, 32, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = '#8D5B4C';
  ctx.beginPath();
  ctx.moveTo(cx, top + h * 0.48 - s * 0.04);
  ctx.lineTo(cx, top + h * 0.48 + s * 0.04);
  ctx.stroke();
}

function drawApothecary(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  shadow(ctx, cx, cy, s);
  const w = s * 0.58;
  const h = s * 0.34;
  const left = cx - w / 2;
  const top = cy + s * 0.1;
  // White plaster cottage
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(left, top, w, h);
  pathStroke(ctx, 1);
  // Red terracotta shingle roof
  ctx.fillStyle = '#D9534F';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.62, top);
  ctx.lineTo(cx, top - s * 0.24);
  ctx.lineTo(cx + w * 0.62, top);
  ctx.closePath();
  ctx.fill();
  pathStroke(ctx, 1);
  // Green mortar-and-pestle cross symbol
  ctx.fillStyle = '#2F7D4F';
  const arm = s * 0.04;
  const midY = top + h * 0.5;
  ctx.fillRect(cx - arm, midY - s * 0.1, arm * 2, s * 0.2);
  ctx.fillRect(cx - s * 0.1, midY - arm, s * 0.2, arm * 2);
}

function drawQuarters(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  shadow(ctx, cx, cy, s);
  const w = s * 0.72;
  const h = s * 0.28;
  const left = cx - w / 2;
  const top = cy + s * 0.08;
  // Long wooden barracks
  ctx.fillStyle = '#8D5B4C';
  ctx.fillRect(left, top, w, h);
  pathStroke(ctx, 1);
  // Plank lines
  ctx.strokeStyle = 'rgba(15, 23, 32, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top + h * 0.5);
  ctx.lineTo(left + w, top + h * 0.5);
  ctx.stroke();
  // Double gables
  ctx.fillStyle = '#6E4538';
  [-0.22, 0.22].forEach((ox) => {
    const gx = cx + ox * s;
    ctx.beginPath();
    ctx.moveTo(gx - s * 0.16, top);
    ctx.lineTo(gx, top - s * 0.16);
    ctx.lineTo(gx + s * 0.16, top);
    ctx.closePath();
    ctx.fill();
    pathStroke(ctx, 1);
  });
  // Small lit windows
  ctx.fillStyle = '#F5C86A';
  [-0.34, -0.1, 0.1, 0.34].forEach((ox) => {
    ctx.fillRect(cx + ox * s - s * 0.035, top + h * 0.3, s * 0.07, s * 0.09);
  });
}

function hull(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string, width: number) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, cy + s * 0.1);
  ctx.lineTo(cx + width / 2, cy + s * 0.1);
  ctx.lineTo(cx + width * 0.36, cy + s * 0.26);
  ctx.lineTo(cx - width * 0.3, cy + s * 0.26);
  ctx.closePath();
  ctx.fill();
  pathStroke(ctx, 1);
}

function drawSchooner(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  shadow(ctx, cx, cy, s);
  hull(ctx, cx, cy, s, '#8B5A2B', s * 0.56);
  // Dual masts with white canvas sails
  [-0.14, 0.14].forEach((ox) => {
    const mx = cx + ox * s;
    ctx.strokeStyle = '#5C3A1A';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(mx, cy + s * 0.1);
    ctx.lineTo(mx, cy - s * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(mx, cy - s * 0.3);
    ctx.quadraticCurveTo(mx + s * 0.14, cy - s * 0.14, mx, cy + s * 0.06);
    ctx.closePath();
    ctx.fill();
    pathStroke(ctx, 1);
  });
  // Trailing fishing net
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
  ctx.lineWidth = 1;
  const nx = cx - s * 0.34;
  ctx.beginPath();
  ctx.moveTo(nx, cy + s * 0.24);
  ctx.lineTo(nx + s * 0.1, cy + s * 0.34);
  ctx.lineTo(nx + s * 0.2, cy + s * 0.24);
  ctx.moveTo(nx + s * 0.03, cy + s * 0.28);
  ctx.lineTo(nx + s * 0.17, cy + s * 0.28);
  ctx.moveTo(nx + s * 0.06, cy + s * 0.31);
  ctx.lineTo(nx + s * 0.14, cy + s * 0.31);
  ctx.stroke();
}

function drawSloop(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, faction: SpriteFaction) {
  shadow(ctx, cx, cy, s);
  hull(ctx, cx, cy, s, '#6B4423', s * 0.5);
  const banner = FACTION_COLORS[faction];
  // Single mast
  ctx.strokeStyle = '#3F2712';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.1);
  ctx.lineTo(cx, cy - s * 0.32);
  ctx.stroke();
  // Billowing mainsail
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.32);
  ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.12, cx, cy + s * 0.08);
  ctx.closePath();
  ctx.fill();
  pathStroke(ctx, 1);
  // Faction banner at masthead
  ctx.fillStyle = banner;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.32);
  ctx.lineTo(cx - s * 0.16, cy - s * 0.26);
  ctx.lineTo(cx, cy - s * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawGalleon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  shadow(ctx, cx, cy, s);
  // Heavy black hull
  hull(ctx, cx, cy, s, '#1E293B', s * 0.62);
  // Triple masts with tattered charcoal sails
  [-0.2, 0, 0.2].forEach((ox) => {
    const mx = cx + ox * s;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(mx, cy + s * 0.1);
    ctx.lineTo(mx, cy - s * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(mx, cy - s * 0.3);
    ctx.lineTo(mx + s * 0.12, cy - s * 0.1);
    ctx.lineTo(mx + s * 0.06, cy - s * 0.04);
    ctx.lineTo(mx, cy - s * 0.08);
    ctx.closePath();
    ctx.fill();
  });
  // Jolly roger marker above the mainmast
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.34, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.03, cy - s * 0.37);
  ctx.lineTo(cx + s * 0.03, cy - s * 0.31);
  ctx.moveTo(cx + s * 0.03, cy - s * 0.37);
  ctx.lineTo(cx - s * 0.03, cy - s * 0.31);
  ctx.stroke();
}

function fishShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, flip: boolean) {
  const dir = flip ? -1 : 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.08, s * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.moveTo(cx - dir * s * 0.08, cy);
  ctx.lineTo(cx - dir * s * 0.13, cy - s * 0.035);
  ctx.lineTo(cx - dir * s * 0.13, cy + s * 0.035);
  ctx.closePath();
  ctx.fill();
}

function drawFishShoal(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Three fish in an offset chevron
  fishShape(ctx, cx - s * 0.12, cy - s * 0.1, s, false);
  fishShape(ctx, cx + s * 0.04, cy - s * 0.1, s, false);
  fishShape(ctx, cx - s * 0.04, cy + s * 0.1, s, true);
}

function drawSquall(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Soft puffy cloud
  ctx.fillStyle = '#E2E8F0';
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(cx - s * 0.14, cy - s * 0.04, s * 0.14, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.02, cy - s * 0.1, s * 0.18, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.18, cy - s * 0.02, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Three faint diagonal rain streaks
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = Math.max(1, s * 0.025);
  [-0.14, 0, 0.14].forEach((ox) => {
    ctx.beginPath();
    ctx.moveTo(cx + ox * s, cy + s * 0.14);
    ctx.lineTo(cx + ox * s - s * 0.05, cy + s * 0.3);
    ctx.stroke();
  });
}

function drawTempest(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Tight swirling cyan-grey vortex with an eye
  ctx.strokeStyle = '#9FB8C4';
  ctx.lineWidth = Math.max(1.5, s * 0.07);
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 4; a += 0.25) {
    const r = s * 0.05 + (a / (Math.PI * 4)) * s * 0.26;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawMutineer(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // Crossed iron cutlass blades
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy - s * 0.18);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.14);
  ctx.stroke();
  ctx.strokeStyle = '#EF4444';
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.2, cy - s * 0.18);
  ctx.lineTo(cx - s * 0.2, cy + s * 0.14);
  ctx.stroke();
  // Burning torch
  ctx.strokeStyle = '#7C4A1E';
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.lineTo(cx, cy + s * 0.06);
  ctx.stroke();
  const flicker = 0.6 + 0.4 * Math.sin(performance.now() / 180);
  ctx.fillStyle = `rgba(245, 158, 11, ${flicker})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.02, s * 0.06, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.01, s * 0.03, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}
