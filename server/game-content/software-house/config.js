const DIFFICULTY_MODIFIERS = {
  easy: {
    cashMultiplier: 1.5,
    expenseMultiplier: 0.8,
    probabilityBonus: 0.1,
    startingReputationBonus: 10
  },
  normal: {
    cashMultiplier: 1,
    expenseMultiplier: 1,
    probabilityBonus: 0,
    startingReputationBonus: 0
  },
  hard: {
    cashMultiplier: 0.7,
    expenseMultiplier: 1.15,
    probabilityBonus: -0.05,
    startingReputationBonus: -5
  },
  expert: {
    cashMultiplier: 0.5,
    expenseMultiplier: 1.3,
    probabilityBonus: -0.1,
    startingReputationBonus: -10
  }
};

const softwareHouseConfig = {
  id: 'software-house',
  name: 'Software House',
  tagline: 'Ship contracts. Survive delivery. Compound reputation.',
  description:
    'You run a custom software studio. Revenue comes from project contracts. The bottleneck is delivery capacity versus the sales pipeline. Technical debt and missed deadlines are the signature risks.',
  locked: false,
  release: 1,
  coreBottleneck: 'Delivery capacity vs. sales pipeline',
  primaryRevenueDriver: 'Project contracts',
  signatureRisk: 'Technical debt / delivery failure',
  openingEventId: 'swh-01-founding-bet',
  workforceAggregateThreshold: 25,
  startingState: {
    cash: 100000,
    revenue: 0,
    monthlyExpenses: 8000,
    reputation: 10,
    employees: 3,
    customers: 0,
    debt: 0,
    operationalCapacity: 100,
    quality: 70,
    employeeMorale: 68,
    marketShare: 0.4,
    brandStrength: 12,
    companyValue: 220000,
    netProfit: -8000,
    operatingProfit: -8000,
    otherExpenses: 0
  },
  startingIndustryState: {
    deliveryRisk: 0,
    technicalDebt: 8,
    pipeline: 0,
    utilization: 40
  },
  revenueModel: {
    type: 'project-contracts',
    revenueMultiple: 2.2,
    profitMultiple: 6,
    brandPremiumFactor: 500000,
    taxRate: 0.29,
    defaultInterestRate: 11.5
  },
  initialMarket: {
    marketGrowth: 4.1,
    inflation: 6.2,
    interestRate: 11.5,
    consumerDemand: 0.95,
    competitionIntensity: 0.4,
    economicCondition: 'normal',
    technologyTrend: 'cloud-migration'
  },
  roles: [
    { id: 'developer', title: 'Developer', salary: 7000, output: 10 },
    { id: 'designer', title: 'Designer', salary: 5500, output: 6 },
    { id: 'pm', title: 'Project Manager', salary: 8000, output: 4 },
    { id: 'qa', title: 'QA Engineer', salary: 5000, output: 5 },
    { id: 'sales', title: 'Sales', salary: 6000, output: 3 }
  ],
  startingWorkforce: [
    { role: 'developer', title: 'Developer', count: 2, avgSkill: 58, avgMorale: 70, avgProductivity: 72, unitSalary: 1500, totalSalary: 3000 },
    { role: 'pm', title: 'Project Manager', count: 1, avgSkill: 62, avgMorale: 66, avgProductivity: 68, unitSalary: 1000, totalSalary: 1000 }
  ],
  scoreBenchmarks: {
    easy: { cash: [0, 2500000], revenue: [0, 450000], valuation: [0, 18000000], marketShare: [0, 18] },
    normal: { cash: [0, 2000000], revenue: [0, 400000], valuation: [0, 15000000], marketShare: [0, 16] },
    hard: { cash: [0, 1600000], revenue: [0, 350000], valuation: [0, 12000000], marketShare: [0, 14] },
    expert: { cash: [0, 1200000], revenue: [0, 300000], valuation: [0, 10000000], marketShare: [0, 12] }
  },
  failureConditions: [
    {
      code: 'liquidity-crisis',
      title: 'Liquidity Crisis',
      description: 'Cash is negative. Payroll and vendors cannot be paid without a turnaround.',
      recoveryEventId: 'swh-critical-turnaround'
    },
    {
      code: 'unsustainable-debt',
      title: 'Unsustainable Debt',
      description: 'Interest and principal have outrun operating cash generation.',
      recoveryEventId: 'swh-critical-turnaround'
    },
    {
      code: 'reputation-collapse',
      title: 'Reputation Collapse',
      description: 'The market no longer trusts you to deliver.',
      recoveryEventId: 'swh-critical-turnaround'
    },
    {
      code: 'customer-collapse',
      title: 'Customer Collapse',
      description: 'The pipeline is empty and no one is paying.',
      recoveryEventId: 'swh-critical-turnaround'
    },
    {
      code: 'bankruptcy',
      title: 'Bankruptcy',
      description: 'The company cannot meet its obligations.',
      recoveryEventId: 'swh-critical-turnaround'
    }
  ]
};

const STUBS = [
  {
    id: 'ai-company',
    name: 'AI Company',
    tagline: 'Compute cost versus model quality.',
    description: 'Funding rounds and API revenue, with model failure as the signature risk. Unlocks in Release 1.',
    locked: true,
    release: 1,
    coreBottleneck: 'Compute cost vs. model quality',
    primaryRevenueDriver: 'Funding rounds + API/enterprise revenue',
    signatureRisk: 'Model failure / competitor leapfrog'
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    tagline: 'Cash trapped in inventory.',
    description: 'Unit sales and rent against interest-rate and construction-delay risk. Unlocks in Release 2.',
    locked: true,
    release: 2,
    coreBottleneck: 'Cash tied up in inventory',
    primaryRevenueDriver: 'Unit sales / rent',
    signatureRisk: 'Interest rate & construction delay'
  },
  {
    id: 'furniture',
    name: 'Furniture Manufacturing',
    tagline: 'Capacity versus demand.',
    description: 'Wholesale and export orders, with defect rate and logistics failure as signature risks. Unlocks in Release 2.',
    locked: true,
    release: 2,
    coreBottleneck: 'Production capacity vs. demand',
    primaryRevenueDriver: 'Wholesale/export orders',
    signatureRisk: 'Defect rate / logistics failure'
  },
  {
    id: 'bank',
    name: 'Bank',
    tagline: 'Capital adequacy and liquidity.',
    description: 'Interest income minus deposit cost. Non-performing loans can shut you down. Unlocks in Release 3.',
    locked: true,
    release: 3,
    coreBottleneck: 'Capital adequacy & liquidity',
    primaryRevenueDriver: 'Interest income (loans − deposits cost)',
    signatureRisk: 'Non-performing loans / regulatory shutdown'
  },
  {
    id: 'tourism',
    name: 'Tourism',
    tagline: 'Seasonal demand, fragile partners.',
    description: 'Package bookings against cancellations and partner failure. Unlocks in Release 3.',
    locked: true,
    release: 3,
    coreBottleneck: 'Seasonal demand volatility',
    primaryRevenueDriver: 'Package bookings',
    signatureRisk: 'Cancellations / partner failure'
  }
];

function stubConfig(stub) {
  return {
    ...stub,
    openingEventId: null,
    workforceAggregateThreshold: 25,
    startingState: { ...softwareHouseConfig.startingState },
    startingIndustryState: {},
    revenueModel: { ...softwareHouseConfig.revenueModel },
    initialMarket: { ...softwareHouseConfig.initialMarket },
    roles: [],
    startingWorkforce: [],
    scoreBenchmarks: softwareHouseConfig.scoreBenchmarks,
    failureConditions: []
  };
}

module.exports = {
  DIFFICULTY_MODIFIERS,
  softwareHouseConfig,
  industries: [
    softwareHouseConfig,
    ...STUBS.map((s) => stubConfig(s))
  ]
};
