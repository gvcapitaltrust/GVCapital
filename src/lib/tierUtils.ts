export interface Tier {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  minDividend: number;
  maxDividend: number;
  yearlyBonus?: number;
  lockInDays: number;
  color: string;
  benefits: string[];
}

export const TIERS: Tier[] = [
  {
    id: "silver",
    name: "Silver",
    minAmount: 1,
    maxAmount: 3000,
    minDividend: 0.03,
    maxDividend: 0.03,
    lockInDays: 180,
    color: "zinc",
    benefits: ["Entry-level Access", "Standard Support", "Monthly Statements"],
  },
  {
    id: "gold",
    name: "Gold",
    minAmount: 3001,
    maxAmount: 5000,
    minDividend: 0.03,
    maxDividend: 0.05,
    lockInDays: 180,
    color: "slate",
    benefits: ["Priority Support", "Quarterly Strategy Review", "Enhanced Yield"],
  },
  {
    id: "platinum",
    name: "Platinum",
    minAmount: 5001,
    maxAmount: 10000,
    minDividend: 0.05,
    maxDividend: 0.05,
    yearlyBonus: 0.03,
    lockInDays: 180,
    color: "gv-gold",
    benefits: ["Dedicated Account Manager", "Custom Portfolio Alerts", "VIP Events Access", "Extra 3% Yearly Bonus"],
  },
  {
    id: "vvip",
    name: "VVIP",
    minAmount: 10001,
    maxAmount: Number.MAX_SAFE_INTEGER,
    minDividend: 0.08,
    maxDividend: 0.08,
    yearlyBonus: 0.04,
    lockInDays: 365,
    color: "amber",
    benefits: [
      "Premium Fixed Returns",
      "Extra 4% Yearly Bonus",
      "12-Month Lock-in Period",
      "Zero Withdrawal Fees",
      "Insurance Coverage",
      "Legacy Wealth Planning",
    ],
  },
];

export const getTierByAmount = (amountUSD: number): Tier => {
  // Find highest tier where amount is greater than or equal to minAmount (USD)
  const matchingTiers = TIERS.filter((t) => amountUSD >= t.minAmount);
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
