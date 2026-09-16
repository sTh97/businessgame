module.exports = [
  {
    _id: 'first-profit',
    title: 'First Profit',
    description: 'Post a positive net profit.',
    condition: { expr: 'netProfit > 0' }
  },
  {
    _id: 'runway-builder',
    title: 'Runway Builder',
    description: 'Hold at least $200,000 cash.',
    condition: { expr: 'cash >= 200000' }
  },
  {
    _id: 'reputation-30',
    title: 'Taken Seriously',
    description: 'Reach reputation 30.',
    condition: { expr: 'reputation >= 30' }
  },
  {
    _id: 'reputation-60',
    title: 'Name in the Room',
    description: 'Reach reputation 60.',
    condition: { expr: 'reputation >= 60' }
  },
  {
    _id: 'team-10',
    title: 'Double Digits',
    description: 'Grow to 10 employees.',
    condition: { expr: 'employees >= 10' }
  },
  {
    _id: 'customers-5',
    title: 'A Real Book of Business',
    description: 'Serve 5 customers.',
    condition: { expr: 'customers >= 5' }
  },
  {
    _id: 'quality-shop',
    title: 'Craft Matters',
    description: 'Push quality to 85.',
    condition: { expr: 'quality >= 85' }
  },
  {
    _id: 'valued-million',
    title: 'Paper Million',
    description: 'Company value reaches $1,000,000.',
    condition: { expr: 'companyValue >= 1000000' }
  },
  {
    _id: 'no-debt',
    title: 'Sleep at Night',
    description: 'Operate with zero debt after level 8.',
    condition: { expr: 'debt <= 0' }
  },
  {
    _id: 'market-presence',
    title: 'On the Map',
    description: 'Reach 3% market share.',
    condition: { expr: 'marketShare >= 3' }
  }
];
