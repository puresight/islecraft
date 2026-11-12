export interface VictoryStats {
  peakPopulation: number;
  finalTreasurySats: number;
  buildingCount: number;
  raidersSunk: number;
  finalScore: number;
  rank: string;
  rankFlavor: string;
}

const RANK_TIERS = [
  { min: 150, rank: 'Sovereign Maritime Commonwealth', flavor: 'Master of the Indies' },
  { min: 100, rank: 'Prosperous Royal Colony', flavor: 'The Crown sends its compliments.' },
  { min: 50, rank: 'Struggling Outpost', flavor: 'Barely holding the beachhead.' },
  { min: 0, rank: 'Abandoned Settlement', flavor: 'The palms reclaim what was built.' },
];

export function rankForScore(score: number): { rank: string; flavor: string } {
  const tier = RANK_TIERS.find((t) => score >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1];
  return { rank: tier.rank, flavor: tier.flavor };
}

export function scoreForCampaign(
  population: number,
  treasurySats: number,
  buildingCount: number,
  raidersSunk: number,
): number {
  return (
    Math.floor(population / 100) +
    Math.floor(treasurySats / 50) +
    buildingCount * 10 +
    raidersSunk * 15
  );
}
