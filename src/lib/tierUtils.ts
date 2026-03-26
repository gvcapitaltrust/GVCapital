export interface Tier {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  minDividend: number;
  maxDividend: number;
  color: string;
  benefits: string[];
}

export const TIERS: Tier[] = [
  {
    id: "silver",
    name: "Silver",
    minAmount: 1,
    maxAmount: 999,
    minDividend: 0.03,
    maxDividend: 0.03,
    color: "zinc",
    benefits: ["Entry-level Access", "Standard Support", "Monthly Statements"],
  },
  {
    id: "gold",
    name: "Gold",
    minAmount: 1000,
    maxAmount: 2999,
    minDividend: 0.03,
    maxDividend: 0.05,
    color: "slate",
    benefits: ["Priority Support", "Quarterly Strategy Review", "Enhanced Yield"],
  },
  {
    id: "platinum",
    name: "Platinum",
    minAmount: 3000,
    maxAmount: 4999,
    minDividend: 0.05,
    maxDividend: 0.08,
    color: "gv-gold",
    benefits: ["Dedicated Account Manager", "Custom Portfolio Alerts", "VIP Events Access"],
  },
  {
    id: "diamond",
    name: "Diamond",
    minAmount: 5000,
    maxAmount: 10000, // Capped at 10k per user request
    minDividend: 0.08,
    maxDividend: 0.1,
    color: "amber",
    benefits: [
      "Premium Fixed Returns",
      "Zero Withdrawal Fees",
      "Insurance Coverage",
      "Legacy Wealth Planning",
    ],
  },
];

export const getTierByAmount = (amount: number): Tier => {
  // Find highest tier where amount is greater than or equal to minAmount
  const matchingTiers = TIERS.filter((t) => amount >= t.minAmount);
  if (matchingTiers.length === 0) return TIERS[0];
  return matchingTiers[matchingTiers.length - 1];
};

export const calculateDividendRange = (amount: number, tier: Tier) => {
  return {
    min: amount * tier.minDividend,
    max: amount * tier.maxDividend,
  };
};

export const formatUSD = (val: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
};
