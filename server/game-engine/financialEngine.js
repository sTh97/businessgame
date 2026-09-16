const { roundMoney, clamp } = require('../utils/sanitize');

function operatingProfit(revenue, operatingExpenses) {
  return revenue - operatingExpenses;
}

function netProfit(opProfit, interest, taxes, exceptionalLosses = 0) {
  return opProfit - interest - taxes - exceptionalLosses;
}

function companyValuation({ annualRevenue, netProfitValue, reputation, debt, config }) {
  const revenueMultiple = config.revenueMultiple ?? 2.2;
  const profitMultiple = config.profitMultiple ?? 6;
  const brandPremiumFactor = config.brandPremiumFactor ?? 500000;
  return (
    annualRevenue * revenueMultiple +
    netProfitValue * profitMultiple * 3 +
    (reputation / 100) * brandPremiumFactor -
    debt
  );
}

function interestExpense(debt, annualRate) {
  if (!debt || debt <= 0) return 0;
  return (debt * (annualRate / 100)) / 12;
}

function taxAmount(profitBeforeTax, taxRate) {
  if (profitBeforeTax <= 0) return 0;
  return profitBeforeTax * taxRate;
}

function recompute(state, industryConfig, market = {}) {
  const fin = industryConfig.revenueModel || {};
  const taxRate = fin.taxRate ?? 0.29;
  const annualRate = market.interestRate ?? fin.defaultInterestRate ?? 11.5;

  const revenue = Math.max(0, Number(state.revenue) || 0);
  const operatingExpenses = Math.max(0, Number(state.monthlyExpenses) || 0);
  const op = operatingProfit(revenue, operatingExpenses);
  const interest = interestExpense(Number(state.debt) || 0, annualRate);
  const pbt = op - interest;
  const taxes = taxAmount(pbt, taxRate);
  const exceptionalLosses = Number(state.exceptionalLosses) || 0;
  const np = netProfit(op, interest, taxes, exceptionalLosses);

  const annualRevenue = revenue * 12;
  const valuation = Math.max(
    0,
    companyValuation({
      annualRevenue,
      netProfitValue: np,
      reputation: Number(state.reputation) || 0,
      debt: Number(state.debt) || 0,
      config: fin
    })
  );

  state.operatingProfit = roundMoney(op);
  state.netProfit = roundMoney(np);
  state.interest = roundMoney(interest);
  state.taxes = roundMoney(taxes);
  state.companyValue = roundMoney(valuation);
  state.reputation = clamp(Number(state.reputation) || 0, 0, 100);
  state.quality = clamp(Number(state.quality) || 0, 0, 100);
  state.employeeMorale = clamp(Number(state.employeeMorale) || 50, 0, 100);
  state.operationalCapacity = clamp(Number(state.operationalCapacity) || 0, 0, 160);
  state.brandStrength = clamp(Number(state.brandStrength) || 0, 0, 100);
  state.marketShare = Math.max(0, Number(state.marketShare) || 0);
  state.cash = roundMoney(state.cash);
  state.debt = Math.max(0, roundMoney(state.debt));
  state.monthlyExpenses = roundMoney(state.monthlyExpenses);
  state.revenue = roundMoney(state.revenue);
  state.customers = Math.max(0, Math.round(Number(state.customers) || 0));
  state.employees = Math.max(0, Math.round(Number(state.employees) || 0));

  return {
    revenue: state.revenue,
    operatingExpenses: state.monthlyExpenses,
    operatingProfit: state.operatingProfit,
    interest: state.interest,
    taxes: state.taxes,
    exceptionalLosses,
    netProfit: state.netProfit,
    cashBalance: state.cash,
    companyValuation: state.companyValue
  };
}

function applyCashFlow(state, extras = {}) {
  const inflows = (Number(extras.cashInflows) || 0) + (Number(state.netProfit) || 0);
  const outflows = Number(extras.cashOutflows) || 0;
  state.cash = roundMoney((Number(state.cash) || 0) + inflows - outflows);
  state.exceptionalLosses = 0;
  return state.cash;
}

module.exports = {
  operatingProfit,
  netProfit,
  companyValuation,
  interestExpense,
  taxAmount,
  recompute,
  applyCashFlow
};
