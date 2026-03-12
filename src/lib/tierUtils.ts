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
    id: "basic",
    name: "Basic Package",
    minAmount: 1,
    maxAmount: 999,
    minDividend: 0.01,
    maxDividend: 0.03,
    color: "zinc",
    benefits: ["Entry-level Access", "Standard Support", "Monthly Statements"],
  },
  {
    id: "silver",
    name: "Silver Package",
    minAmount: 1000,
    maxAmount: 2999,
    minDividend: 0.03,
    maxDividend: 0.05,
    color: "slate",
    benefits: ["Priority Support", "Quarterly Strategy Review", "Enhanced Yield"],
  },
  {
    id: "gold",
    name: "Gold Package",
    minAmount: 3000,
    maxAmount: 4999,
    minDividend: 0.05,
    maxDividend: 0.08,
    color: "gv-gold",
    benefits: ["Dedicated Account Manager", "Custom Portfolio Alerts", "VIP Events Access"],
  },
  {
    id: "platinum",
    name: "Platinum Package",
    minAmount: 5000,
    maxAmount: 10000,
    minDividend: 0.08,
    maxDividend: 0.10,
    color: "amber",
    benefits: ["Premium Fixed Returns", "Zero Withdrawal Fees", "Insurance Coverage", "Legacy Wealth Planning"],
  },
];

export const getTierByAmount = (amountUSD: number): Tier => {
  return (
    TIERS.find((t) => amountUSD >= t.minAmount && amountUSD <= t.maxAmount) ||
    TIERS[0]
  );
};

export const calculateDividendRange = (amountUSD: number, tier: Tier) => {
  return {
    min: amountUSD * tier.minDividend,
    max: amountUSD * tier.maxDividend,
  };
};

export const formatUSD = (val: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(val);
};
