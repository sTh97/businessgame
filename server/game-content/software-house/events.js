function d(id, eventId, label, extra) {
  return { _id: id, eventId, label, ...extra };
}

function pe(key, base, onSuccess, onFailure, modifiers = []) {
  return { key, baseProbability: base, modifiers, onSuccess, onFailure };
}

const reputationMod = [
  { source: 'reputation', formula: 'reputation * 0.002' },
  { source: 'employeeMorale', formula: '(employeeMorale - 50) * 0.001' },
  { source: 'operationalCapacity', condition: '>85', value: -0.12 },
  { source: 'quality', formula: '(quality - 60) * 0.002' }
];

const events = [
  {
    _id: 'swh-01-founding-bet',
    phaseEligible: ['survival'],
    category: 'strategic',
    title: 'The Founding Bet',
    narrative:
      'Three of you just incorporated. A cheap coworking desk, a half-finished website, and $100k of runway. How you spend the first months will set your cost structure for a year.',
    once: true,
    minLevel: 1,
    maxLevel: 2,
    weight: 10,
    decisions: [
      d('swh-01-founding-bet-A', 'swh-01-founding-bet', 'Stay remote and run lean', {
        summary: 'Protect cash. Slower brand, higher focus.',
        tone: 'cautious',
        professionalismDelta: 2,
        setFlags: { workMode: 'remote', housing: 'none' },
        directEffects: { cash: 8000, brandStrength: -4, employeeMorale: 4, monthlyExpenses: -1500 },
        hiddenEffects: { technicalDebt: 4 }
      }),
      d('swh-01-founding-bet-B', 'swh-01-founding-bet', 'Lease a small studio office', {
        summary: 'Look legitimate. Burn cash. Lift morale.',
        tone: 'bold',
        professionalismDelta: 3,
        setFlags: { workMode: 'office', housing: 'rent' },
        setProperty: {
          kind: 'rented',
          monthlyCost: 2500,
          assetValue: 0,
          renovationLevel: 0,
          rooms: [
            { id: 'room-1', label: 'Founder den', quality: 55, occupantId: null },
            { id: 'room-2', label: 'Build bay', quality: 50, occupantId: null },
            { id: 'room-3', label: 'Quiet room', quality: 48, occupantId: null }
          ]
        },
        directEffects: { cash: -18000, reputation: 6, brandStrength: 8, employeeMorale: 8 }
      }),
      d('swh-01-founding-bet-C', 'swh-01-founding-bet', 'Take a founder-friendly micro loan', {
        summary: 'Buy time with debt. Interest starts now.',
        tone: 'risky',
        directEffects: { cash: 40000, debt: 40000, reputation: 2 }
      }),
      d('swh-01-founding-bet-D', 'swh-01-founding-bet', 'Bring in a fourth co-founder for equity', {
        summary: 'Add a seller. Dilute control. No cash out.',
        tone: 'neutral',
        directEffects: { reputation: 3, brandStrength: 5, employeeMorale: 6 },
        workforceEffects: { hire: [{ role: 'sales', count: 1, skill: 64, morale: 80, productivity: 70 }] }
      })
    ]
  },
  {
    _id: 'swh-02-first-hire',
    phaseEligible: ['survival'],
    category: 'employee',
    title: 'The First Real Hire',
    narrative:
      'A recruiter pings you: a senior engineer wants out of a product company. You could also take two hungry juniors, or skip hiring and keep the founders coding.',
    once: true,
    minLevel: 1,
    maxLevel: 6,
    decisions: [
      d('swh-02-first-hire-A', 'swh-02-first-hire', 'Hire the senior (expensive, fast)', {
        summary: 'Quality up. Burn rate up.',
        tone: 'bold',
        professionalismDelta: 3,
        directEffects: { cash: -9000, quality: 8, operationalCapacity: 8 },
        workforceEffects: { hire: [{ role: 'developer', count: 1, skill: 82, morale: 62, productivity: 85 }] }
      }),
      d('swh-02-first-hire-B', 'swh-02-first-hire', 'Hire two juniors', {
        summary: 'Capacity with training drag.',
        tone: 'neutral',
        professionalismDelta: 1,
        directEffects: { quality: -4, employeeMorale: 3 },
        hiddenEffects: { technicalDebt: 6 },
        workforceEffects: {
          hire: [
            { role: 'developer', count: 2, skill: 42, morale: 78, productivity: 48 }
          ]
        }
      }),
      d('swh-02-first-hire-C', 'swh-02-first-hire', 'Stay founder-only for now', {
        summary: 'Save cash. Capacity stays tight.',
        tone: 'cautious',
        professionalismDelta: -1,
        directEffects: { cash: 4000, employeeMorale: -6, operationalCapacity: -6 }
      }),
      d('swh-02-first-hire-D', 'swh-02-first-hire', 'Hire a designer instead', {
        summary: 'Better pitches, weaker delivery bench.',
        tone: 'neutral',
        professionalismDelta: 2,
        directEffects: { reputation: 4, brandStrength: 6, quality: 3 },
        workforceEffects: { hire: [{ role: 'designer', count: 1, skill: 70, morale: 72, productivity: 74 }] }
      })
    ]
  },
  {
    _id: 'swh-03-first-pitch',
    phaseEligible: ['survival'],
    category: 'opportunity',
    title: 'The First Paying Pitch',
    narrative:
      'A local retailer needs a booking system. They have budget, a messy brief, and a cousin who "knows a cheaper freelancer in another city."',
    once: true,
    minLevel: 1,
    maxLevel: 8,
    decisions: [
      d('swh-03-first-pitch-A', 'swh-03-first-pitch', 'Bid low to win the logo', {
        summary: 'Win work. Thin margin. Delivery stress.',
        tone: 'risky',
        directEffects: { reputation: 3, customers: 1, revenue: 6000 },
        hiddenEffects: { deliveryRisk: 12, pipeline: 15 },
        projectEffects: {
          create: {
            projectName: 'Retail Booking System',
            client: 'Harbor Goods',
            contractValue: 28000,
            cost: 22000,
            duration: 3,
            requiredCapacity: 35,
            risk: 0.28,
            qualityRequirement: 60,
            upfront: 7000,
            status: 'in-progress'
          }
        }
      }),
      d('swh-03-first-pitch-B', 'swh-03-first-pitch', 'Bid a fair professional rate', {
        summary: 'May lose the deal. Better economics if you win.',
        tone: 'neutral',
        probabilityEffects: [
          pe(
            'winPitch',
            0.62,
            { customers: 1, revenue: 9000, reputation: 6, cash: 12000 },
            { reputation: -3, employeeMorale: -4 },
            reputationMod
          )
        ],
        projectEffects: {
          create: {
            projectName: 'Retail Booking System',
            client: 'Harbor Goods',
            contractValue: 48000,
            cost: 26000,
            duration: 3,
            requiredCapacity: 28,
            risk: 0.16,
            qualityRequirement: 70,
            upfront: 12000
          }
        }
      }),
      d('swh-03-first-pitch-C', 'swh-03-first-pitch', 'Walk away — the brief is a trap', {
        summary: 'Protect delivery. No revenue this month.',
        tone: 'cautious',
        directEffects: { reputation: 1, employeeMorale: 4, quality: 2 }
      }),
      d('swh-03-first-pitch-D', 'swh-03-first-pitch', 'Propose a tiny paid discovery first', {
        summary: 'Small cash now. Relationship option later.',
        tone: 'cautious',
        directEffects: { cash: 4500, customers: 1, revenue: 4500, reputation: 2, brandStrength: 3 }
      })
    ]
  },
  {
    _id: 'swh-04-cash-crunch',
    phaseEligible: ['survival'],
    category: 'financial',
    title: 'Payroll Week',
    narrative:
      'A client invoice slipped. Payroll hits in four days. The bookkeeper asks the question every founder hates: what do we delay?',
    eligibility: { cash: { lte: 90000 } },
    minLevel: 2,
    maxLevel: 12,
    repeatable: true,
    decisions: [
      d('swh-04-cash-crunch-A', 'swh-04-cash-crunch', 'Founder skips salary this month', {
        summary: 'Buy runway. Personal strain.',
        tone: 'cautious',
        professionalismDelta: 3,
        directEffects: { cash: 8000, employeeMorale: -3 }
      }),
      d('swh-04-cash-crunch-B', 'swh-04-cash-crunch', 'Chase the invoice aggressively', {
        summary: 'Might collect. Might sour the account.',
        tone: 'bold',
        professionalismDelta: 1,
        probabilityEffects: [
          pe('collectInvoice', 0.7, { cash: 18000, reputation: -2 }, { reputation: -6, customers: -1 }, reputationMod)
        ]
      }),
      d('swh-04-cash-crunch-C', 'swh-04-cash-crunch', 'Draw a short-term credit line', {
        summary: 'Cash now. Debt and interest later.',
        tone: 'risky',
        professionalismDelta: -1,
        directEffects: { cash: 25000, debt: 25000 }
      }),
      d('swh-04-cash-crunch-D', 'swh-04-cash-crunch', 'Delay a contractor payment', {
        summary: 'Quiet damage to your vendor reputation.',
        tone: 'risky',
        professionalismDelta: -5,
        directEffects: { cash: 9000, reputation: -4, quality: -3 },
        delayedEffects: [
          { triggerLevel: '+4', probability: 0.45, label: 'A contractor refuses to work with you again', effects: { operationalCapacity: -8, reputation: -4 } }
        ]
      })
    ]
  },
  {
    _id: 'swh-05-scope-creep',
    phaseEligible: ['survival', 'early-growth'],
    category: 'customer',
    title: 'Just One More Feature',
    narrative:
      'The client loves the demo — and now wants "a small dashboard, notifications, and maybe an app." None of it is in the statement of work.',
    eligibility: { customers: { gte: 1 } },
    minLevel: 3,
    decisions: [
      d('swh-05-scope-creep-A', 'swh-05-scope-creep', 'Say yes to keep them happy', {
        summary: 'Goodwill now. Delivery risk later.',
        tone: 'risky',
        directEffects: { reputation: 5, employeeMorale: -8, operationalCapacity: -10 },
        hiddenEffects: { deliveryRisk: 18, technicalDebt: 10 },
        delayedEffects: [
          { triggerLevel: '+5', probability: 0.4, label: 'Unscoped work detonates the timeline', eventPool: 'delivery-strain', effects: { reputation: -12, cash: -8000, quality: -6 } }
        ]
      }),
      d('swh-05-scope-creep-B', 'swh-05-scope-creep', 'Issue a change order', {
        summary: 'Fair. They might push back.',
        tone: 'neutral',
        probabilityEffects: [
          pe('changeOrder', 0.68, { cash: 14000, revenue: 4000, reputation: 2 }, { reputation: -5, employeeMorale: -3 }, reputationMod)
        ]
      }),
      d('swh-05-scope-creep-C', 'swh-05-scope-creep', 'Hold the line on the original SOW', {
        summary: 'Protect delivery. Client may feel cold.',
        tone: 'cautious',
        directEffects: { reputation: -3, quality: 5, employeeMorale: 6 }
      }),
      d('swh-05-scope-creep-D', 'swh-05-scope-creep', 'Offer a cheap follow-on phase', {
        summary: 'Pipeline without wrecking this sprint.',
        tone: 'neutral',
        directEffects: { reputation: 3, revenue: 2500 },
        industryDirectEffects: { pipeline: 20 }
      })
    ]
  },
  {
    _id: 'swh-06-quality-vs-speed',
    phaseEligible: ['survival', 'early-growth'],
    category: 'technology',
    title: 'Ship Friday or Test Monday',
    narrative:
      'A launch date was promised in a sales call you were not in. QA says the build is "probably fine." Production says it is not.',
    minLevel: 3,
    decisions: [
      d('swh-06-quality-vs-speed-A', 'swh-06-quality-vs-speed', 'Ship now', {
        summary: 'Hit the date. Roll the dice on defects.',
        tone: 'risky',
        directEffects: { reputation: 4, cash: 6000, employeeMorale: 3, quality: -8 },
        hiddenEffects: { deliveryRisk: 16, technicalDebt: 12 },
        probabilityEffects: [
          pe('prodIncident', 0.55, { reputation: 2 }, { reputation: -14, cash: -12000, customers: -1 }, [
            { source: 'quality', formula: '(quality - 50) * 0.004' }
          ])
        ]
      }),
      d('swh-06-quality-vs-speed-B', 'swh-06-quality-vs-speed', 'Delay a week and test', {
        summary: 'Burn goodwill. Raise quality.',
        tone: 'cautious',
        directEffects: { reputation: -4, quality: 9, employeeMorale: 4, cash: -3000 }
      }),
      d('swh-06-quality-vs-speed-C', 'swh-06-quality-vs-speed', 'Hire a contract QA for the crunch', {
        summary: 'Spend to de-risk.',
        tone: 'neutral',
        directEffects: { cash: -7000, quality: 6, operationalCapacity: 5 },
        workforceEffects: { hire: [{ role: 'qa', count: 1, skill: 68, morale: 60, productivity: 72 }] }
      }),
      d('swh-06-quality-vs-speed-D', 'swh-06-quality-vs-speed', 'Cut features to make the date honestly', {
        summary: 'Smaller launch. Cleaner night.',
        tone: 'cautious',
        directEffects: { reputation: -2, quality: 5, employeeMorale: 5, cash: 2000 }
      })
    ]
  },
  {
    _id: 'swh-07-competitor-undercut',
    phaseEligible: ['survival', 'early-growth'],
    category: 'competitor',
    title: 'A Shop Across Town Undercuts You',
    narrative:
      'A two-person studio quotes 40% less on a deal you expected to win. Your champion at the client goes quiet.',
    minLevel: 4,
    decisions: [
      d('swh-07-competitor-undercut-A', 'swh-07-competitor-undercut', 'Match the price', {
        summary: 'Keep the work. Hurt the model.',
        tone: 'risky',
        directEffects: { revenue: -2000, customers: 1, reputation: 2, cash: 4000 },
        hiddenEffects: { deliveryRisk: 8 }
      }),
      d('swh-07-competitor-undercut-B', 'swh-07-competitor-undercut', 'Hold price and sell quality', {
        summary: 'Win on trust or lose the deal.',
        tone: 'bold',
        probabilityEffects: [
          pe('holdPrice', 0.5, { customers: 1, reputation: 8, cash: 16000, revenue: 8000 }, { reputation: -4, marketShare: -0.2 }, reputationMod)
        ]
      }),
      d('swh-07-competitor-undercut-C', 'swh-07-competitor-undercut', 'Walk — this client wants cheap, not good', {
        summary: 'Protect positioning.',
        tone: 'cautious',
        directEffects: { brandStrength: 6, reputation: 2, employeeMorale: 3 }
      }),
      d('swh-07-competitor-undercut-D', 'swh-07-competitor-undercut', 'Offer a narrower, cheaper package', {
        summary: 'Compete without a race to the bottom.',
        tone: 'neutral',
        directEffects: { cash: 7000, revenue: 3500, customers: 1, reputation: 1 }
      })
    ]
  },
  {
    _id: 'swh-08-big-client',
    phaseEligible: ['survival', 'early-growth'],
    category: 'opportunity',
    title: 'The Big Client',
    narrative:
      'A national retailer wants a POS platform in four months. The contract would more than double your year. Your capacity is already humming.',
    once: true,
    minLevel: 6,
    maxLevel: 18,
    eligibility: { reputation: { gte: 12 } },
    decisions: [
      d('swh-08-big-client-A', 'swh-08-big-client', 'Accept immediately', {
        summary: 'Huge pipeline. Delivery strain is almost guaranteed.',
        tone: 'risky',
        directEffects: { reputation: 4 },
        industryDirectEffects: { pipeline: 40, deliveryRisk: 20 },
        conditionalEffects: [{ if: 'operationalCapacity > 85', then: { employeeMorale: -10 } }],
        probabilityEffects: [
          pe(
            'deliverySuccess',
            0.65,
            { reputation: 5, cash: 40000, revenue: 18000, customers: 1 },
            { reputation: -15, cash: 12000, customers: 1 },
            reputationMod
          )
        ],
        hiddenEffects: { deliveryRisk: 20 },
        delayedEffects: [
          { triggerLevel: '+6', probability: 0.3, label: 'Delivery strain from the big client', eventPool: 'delivery-strain', effects: { employeeMorale: -8, quality: -5 } }
        ],
        projectEffects: {
          create: {
            projectName: 'Retail POS Platform',
            client: 'Acme Retail',
            contractValue: 200000,
            cost: 140000,
            duration: 4,
            requiredCapacity: 40,
            risk: 0.22,
            qualityRequirement: 72,
            upfront: 40000
          }
        }
      }),
      d('swh-08-big-client-B', 'swh-08-big-client', 'Negotiate timeline and a discovery sprint', {
        summary: 'Safer delivery. Smaller upfront thrill.',
        tone: 'neutral',
        directEffects: { reputation: 6, cash: 18000, customers: 1, revenue: 8000 },
        projectEffects: {
          create: {
            projectName: 'Retail POS Discovery + Build',
            client: 'Acme Retail',
            contractValue: 160000,
            cost: 100000,
            duration: 5,
            requiredCapacity: 28,
            risk: 0.14,
            qualityRequirement: 74,
            upfront: 18000
          }
        }
      }),
      d('swh-08-big-client-C', 'swh-08-big-client', 'Decline — we cannot staff this', {
        summary: 'Painful. Possibly wise.',
        tone: 'cautious',
        directEffects: { reputation: -2, employeeMorale: 8, brandStrength: 4 }
      }),
      d('swh-08-big-client-D', 'swh-08-big-client', 'Accept and staff up with contractors', {
        summary: 'Capacity on credit. Culture risk.',
        tone: 'bold',
        directEffects: { cash: -16000, operationalCapacity: 12, employeeMorale: -6, customers: 1, revenue: 12000 },
        hiddenEffects: { technicalDebt: 8 },
        projectEffects: {
          create: {
            projectName: 'Retail POS Platform',
            client: 'Acme Retail',
            contractValue: 200000,
            cost: 155000,
            duration: 4,
            requiredCapacity: 32,
            risk: 0.2,
            qualityRequirement: 70,
            upfront: 35000
          }
        }
      })
    ]
  },
  {
    _id: 'swh-09-hiring-crunch',
    phaseEligible: ['survival', 'early-growth'],
    category: 'employee',
    title: 'Hiring Crunch',
    narrative:
      'Open roles sit for weeks. A candidate asks for 20% above band. Another offers to start Monday if you skip references.',
    minLevel: 5,
    decisions: [
      d('swh-09-hiring-crunch-A', 'swh-09-hiring-crunch', 'Pay above band for the star', {
        summary: 'Skill now. Comp inflation later.',
        tone: 'bold',
        directEffects: { cash: -4000, quality: 5, employeeMorale: -4 },
        workforceEffects: { hire: [{ role: 'developer', count: 1, skill: 84, morale: 70, productivity: 88 }] },
        delayedEffects: [{ triggerLevel: '+5', probability: 0.35, label: 'Existing staff demand a raise', effects: { monthlyExpenses: 3000, employeeMorale: 4 } }]
      }),
      d('swh-09-hiring-crunch-B', 'swh-09-hiring-crunch', 'Skip references and start Monday', {
        summary: 'Speed. Asymmetric risk.',
        tone: 'risky',
        workforceEffects: { hire: [{ role: 'developer', count: 1, skill: 60, morale: 55, productivity: 60 }] },
        delayedEffects: [
          { triggerLevel: '+3', probability: 0.4, label: 'The rushed hire becomes a performance problem', effects: { quality: -8, employeeMorale: -6, reputation: -3 } }
        ]
      }),
      d('swh-09-hiring-crunch-C', 'swh-09-hiring-crunch', 'Keep interviewing — no panic hires', {
        summary: 'Culture preserved. Capacity stays tight.',
        tone: 'cautious',
        directEffects: { employeeMorale: 5, operationalCapacity: -4, quality: 2 }
      }),
      d('swh-09-hiring-crunch-D', 'swh-09-hiring-crunch', 'Stand up a contractor bench', {
        summary: 'Flexible capacity. Weaker craft.',
        tone: 'neutral',
        directEffects: { cash: -6000, operationalCapacity: 10, quality: -3 }
      })
    ]
  },
  {
    _id: 'swh-10-server-outage',
    phaseEligible: ['survival', 'early-growth', 'expansion'],
    category: 'crisis',
    title: 'Production Is Down',
    narrative:
      'A client WhatsApps at 1:14 a.m.: checkout is dead. Your on-call rotation is "whoever is awake."',
    minLevel: 4,
    repeatable: true,
    decisions: [
      d('swh-10-server-outage-A', 'swh-10-server-outage', 'All-hands until it is fixed', {
        summary: 'Save the account. Burn the team.',
        tone: 'bold',
        directEffects: { reputation: 6, employeeMorale: -10, cash: -2000, quality: 3 },
        delayedEffects: [{ triggerLevel: '+3', probability: 0.35, label: 'Quiet quitting after the war room', effects: { employeeMorale: -8, operationalCapacity: -6 } }]
      }),
      d('swh-10-server-outage-B', 'swh-10-server-outage', 'Pay an incident specialist tonight', {
        summary: 'Expensive. Cleaner.',
        tone: 'neutral',
        directEffects: { cash: -9000, reputation: 4, employeeMorale: 2, quality: 4 }
      }),
      d('swh-10-server-outage-C', 'swh-10-server-outage', 'Communicate honestly and patch in business hours', {
        summary: 'Some clients respect it. Some do not.',
        tone: 'cautious',
        probabilityEffects: [
          pe('honestOutage', 0.6, { reputation: 3 }, { reputation: -10, customers: -1 }, reputationMod)
        ]
      }),
      d('swh-10-server-outage-D', 'swh-10-server-outage', 'Invest in monitoring after a messy patch', {
        summary: 'Short-term pain, long-term reliability.',
        tone: 'neutral',
        directEffects: { cash: -12000, reputation: -3, quality: 8 },
        industryDirectEffects: { deliveryRisk: -10 }
      })
    ]
  },
  {
    _id: 'swh-11-burnout',
    phaseEligible: ['survival', 'early-growth'],
    category: 'employee',
    title: 'Someone Is About to Break',
    narrative:
      'Your strongest developer starts answering Slack at noon and disappearing at 4. A 1:1 reveals they have not taken a weekend in nine weeks.',
    minLevel: 5,
    decisions: [
      d('swh-11-burnout-A', 'swh-11-burnout', 'Force PTO and re-plan delivery', {
        summary: 'Human. Dates slip.',
        tone: 'cautious',
        directEffects: { employeeMorale: 12, operationalCapacity: -8, reputation: -2, quality: 3 }
      }),
      d('swh-11-burnout-B', 'swh-11-burnout', 'Pay a retention bonus and keep going', {
        summary: 'Buys weeks, not months.',
        tone: 'risky',
        directEffects: { cash: -8000, employeeMorale: 4 },
        delayedEffects: [{ triggerLevel: '+4', probability: 0.5, label: 'The same engineer resigns anyway', effects: { employees: -1, operationalCapacity: -10, employeeMorale: -6 } }]
      }),
      d('swh-11-burnout-C', 'swh-11-burnout', 'Hire help onto their project', {
        summary: 'Dilute heroics.',
        tone: 'neutral',
        directEffects: { cash: -5000 },
        workforceEffects: { hire: [{ role: 'developer', count: 1, skill: 60, morale: 70, productivity: 64 }] }
      }),
      d('swh-11-burnout-D', 'swh-11-burnout', 'Ignore it — deadlines first', {
        summary: 'Short-term throughput. Cultural rot.',
        tone: 'risky',
        directEffects: { operationalCapacity: 4, employeeMorale: -12, quality: -4 },
        hiddenEffects: { deliveryRisk: 10 }
      })
    ]
  },
  {
    _id: 'swh-12-referral',
    phaseEligible: ['survival', 'early-growth'],
    category: 'opportunity',
    title: 'A Quiet Referral',
    narrative:
      'A satisfied ops manager forwards your name to a peer in another city. They want a similar system, cheaper, and sooner.',
    eligibility: { reputation: { gte: 18 } },
    minLevel: 6,
    decisions: [
      d('swh-12-referral-A', 'swh-12-referral', 'Take it at a friends-and-family rate', {
        summary: 'Volume. Margin thin.',
        tone: 'neutral',
        directEffects: { customers: 1, cash: 9000, revenue: 5000, reputation: 3 },
        projectEffects: {
          create: {
            projectName: 'Referral Rebuild',
            client: 'Northline Ops',
            contractValue: 42000,
            cost: 30000,
            duration: 3,
            requiredCapacity: 22,
            risk: 0.18,
            upfront: 9000
          }
        }
      }),
      d('swh-12-referral-B', 'swh-12-referral', 'Quote full rate — referrals still pay', {
        summary: 'Respect the work.',
        tone: 'bold',
        probabilityEffects: [
          pe('referralFull', 0.58, { customers: 1, cash: 16000, revenue: 9000, reputation: 5 }, { reputation: -2 }, reputationMod)
        ]
      }),
      d('swh-12-referral-C', 'swh-12-referral', 'Productize the last build as a starter kit', {
        summary: 'Toward repeatable revenue.',
        tone: 'bold',
        directEffects: { cash: -7000, brandStrength: 8, quality: 3 },
        industryDirectEffects: { pipeline: 15 },
        delayedEffects: [{ triggerLevel: '+4', probability: 0.55, label: 'Starter kit lands a small retainer', effects: { revenue: 6000, cash: 6000, customers: 1 } }]
      }),
      d('swh-12-referral-D', 'swh-12-referral', 'Pass — we are at capacity', {
        summary: 'Protect delivery.',
        tone: 'cautious',
        directEffects: { employeeMorale: 5, quality: 3, reputation: 1 }
      })
    ]
  },
  {
    _id: 'swh-13-tooling',
    phaseEligible: ['survival', 'early-growth'],
    category: 'technology',
    title: 'The Tooling Invoice',
    narrative:
      'Your stack is held together with personal GitHub accounts and a spreadsheet. A proper CI, design system, and project tool would cost a painful month of profit.',
    minLevel: 6,
    decisions: [
      d('swh-13-tooling-A', 'swh-13-tooling', 'Buy the full professional stack', {
        summary: 'Quality and speed, cash down.',
        tone: 'bold',
        directEffects: { cash: -14000, quality: 8, operationalCapacity: 6, monthlyExpenses: 800 },
        industryDirectEffects: { technicalDebt: -8 }
      }),
      d('swh-13-tooling-B', 'swh-13-tooling', 'Open-source and duct tape', {
        summary: 'Cheap. Slow tax later.',
        tone: 'cautious',
        directEffects: { cash: -1500, employeeMorale: -3 },
        hiddenEffects: { technicalDebt: 10 }
      }),
      d('swh-13-tooling-C', 'swh-13-tooling', 'Invest only in CI and tests', {
        summary: 'Targeted de-risking.',
        tone: 'neutral',
        directEffects: { cash: -6000, quality: 6 },
        industryDirectEffects: { deliveryRisk: -8 }
      }),
      d('swh-13-tooling-D', 'swh-13-tooling', 'Build an internal tool (founders code at night)', {
        summary: 'Hidden cost on morale.',
        tone: 'risky',
        directEffects: { cash: -2000, quality: 4, employeeMorale: -8 },
        delayedEffects: [{ triggerLevel: '+5', probability: 0.4, label: 'The internal tool becomes its own product distraction', effects: { operationalCapacity: -6, technicalDebt: 6 } }]
      })
    ]
  },
  {
    _id: 'swh-14-late-payment',
    phaseEligible: ['survival', 'early-growth', 'expansion'],
    category: 'financial',
    title: 'Net-90 Becomes Net-Never',
    narrative:
      'A mid-size client is 47 days late. They still send feature requests. Accounts payable says "the run is next cycle."',
    eligibility: { customers: { gte: 1 } },
    minLevel: 7,
    decisions: [
      d('swh-14-late-payment-A', 'swh-14-late-payment', 'Pause work until paid', {
        summary: 'Protect cash. Relationship frost.',
        tone: 'bold',
        directEffects: { reputation: -4, employeeMorale: 3 },
        probabilityEffects: [pe('pauseCollect', 0.72, { cash: 22000 }, { customers: -1, reputation: -6 }, reputationMod)]
      }),
      d('swh-14-late-payment-B', 'swh-14-late-payment', 'Keep working and hope', {
        summary: 'Client-friendly. Founder-unfriendly.',
        tone: 'risky',
        directEffects: { reputation: 3 },
        delayedEffects: [{ triggerLevel: '+3', probability: 0.5, label: 'The invoice finally clears — or becomes a write-off', effects: { cash: 8000 } }]
      }),
      d('swh-14-late-payment-C', 'swh-14-late-payment', 'Offer a small settlement for immediate cash', {
        summary: 'Take 70 cents on the dollar.',
        tone: 'cautious',
        directEffects: { cash: 14000, revenue: -2000, reputation: -1 }
      }),
      d('swh-14-late-payment-D', 'swh-14-late-payment', 'Factor the invoice', {
        summary: 'Cash now, expensive.',
        tone: 'neutral',
        directEffects: { cash: 16000, monthlyExpenses: 400, reputation: 0 }
      })
    ]
  },
  {
    _id: 'swh-15-tech-debt',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'technology',
    title: 'Technical Debt Surfaces',
    narrative:
      'Every new ticket takes longer than the last. A lead says the codebase is "three rewrites pretending to be one product."',
    minLevel: 10,
    eventPoolIds: ['delivery-strain'],
    decisions: [
      d('swh-15-tech-debt-A', 'swh-15-tech-debt', 'Schedule a dedicated refactor sprint', {
        summary: 'No new features. Healthier platform.',
        tone: 'cautious',
        directEffects: { cash: -8000, revenue: -3000, quality: 10, employeeMorale: 6 },
        industryDirectEffects: { technicalDebt: -18, deliveryRisk: -8 }
      }),
      d('swh-15-tech-debt-B', 'swh-15-tech-debt', 'Patch around it and keep selling', {
        summary: 'Revenue now. Slower death.',
        tone: 'risky',
        directEffects: { revenue: 4000, quality: -6, employeeMorale: -5 },
        hiddenEffects: { technicalDebt: 14 },
        delayedEffects: [{ triggerLevel: '+6', probability: 0.55, label: 'A rewrite becomes unavoidable under fire', eventPool: 'delivery-strain', effects: { cash: -20000, reputation: -8 } }]
      }),
      d('swh-15-tech-debt-C', 'swh-15-tech-debt', 'Hire a platform engineer', {
        summary: 'Structural fix with payroll.',
        tone: 'bold',
        directEffects: { quality: 6 },
        industryDirectEffects: { technicalDebt: -10 },
        workforceEffects: { hire: [{ role: 'developer', count: 1, skill: 80, morale: 68, productivity: 78 }] }
      }),
      d('swh-15-tech-debt-D', 'swh-15-tech-debt', 'Freeze sales until quality recovers', {
        summary: 'Radical. Sometimes correct.',
        tone: 'cautious',
        directEffects: { revenue: -6000, quality: 8, reputation: -3, employeeMorale: 4 }
      })
    ]
  },
  {
    _id: 'swh-16-key-resignation',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'employee',
    title: 'A Key Person Has an Offer',
    narrative:
      'Your unofficial architect has a competing offer: 40% more, remote, brand-name logo. They will decide Friday.',
    minLevel: 11,
    decisions: [
      d('swh-16-key-resignation-A', 'swh-16-key-resignation', 'Match the offer', {
        summary: 'Keep the brain. Comp compression problems incoming.',
        tone: 'bold',
        directEffects: { cash: -6000, employeeMorale: -5, monthlyExpenses: 2500, quality: 2 }
      }),
      d('swh-16-key-resignation-B', 'swh-16-key-resignation', 'Let them go and promote from inside', {
        summary: 'Culture story. Skill gap.',
        tone: 'cautious',
        directEffects: { operationalCapacity: -10, employeeMorale: 4, quality: -5 },
        workforceEffects: { fire: [{ role: 'developer', count: 1 }] }
      }),
      d('swh-16-key-resignation-C', 'swh-16-key-resignation', 'Counter with equity and a lead title', {
        summary: 'Cheap cash, real commitment.',
        tone: 'neutral',
        probabilityEffects: [
          pe('retainLead', 0.6, { employeeMorale: 8, quality: 3, reputation: 2 }, { operationalCapacity: -12, quality: -6 }, reputationMod)
        ]
      }),
      d('swh-16-key-resignation-D', 'swh-16-key-resignation', 'Knowledge-transfer sprint, then goodbye', {
        summary: 'Adult exit. Still a hole.',
        tone: 'neutral',
        directEffects: { cash: -3000, quality: 2, operationalCapacity: -6 },
        workforceEffects: { fire: [{ role: 'developer', count: 1 }] }
      })
    ]
  },
  {
    _id: 'swh-17-outsource',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'strategic',
    title: 'An Outsourcing Broker Calls',
    narrative:
      'A vendor promises a "dedicated pod" at half your loaded cost. Your sales lead wants to say yes to three more deals.',
    minLevel: 12,
    decisions: [
      d('swh-17-outsource-A', 'swh-17-outsource', 'Pilot one module with the vendor', {
        summary: 'Learn without marrying them.',
        tone: 'neutral',
        directEffects: { cash: -8000, operationalCapacity: 8, quality: -3 },
        delayedEffects: [{ triggerLevel: '+4', probability: 0.4, label: 'Vendor quality becomes a client complaint', effects: { reputation: -7, quality: -4 } }]
      }),
      d('swh-17-outsource-B', 'swh-17-outsource', 'Scale with them immediately', {
        summary: 'Capacity spike. Brand risk.',
        tone: 'risky',
        directEffects: { operationalCapacity: 18, cash: -15000, quality: -8, employeeMorale: -6, revenue: 8000 },
        hiddenEffects: { deliveryRisk: 14 }
      }),
      d('swh-17-outsource-C', 'swh-17-outsource', 'Decline and hire locally', {
        summary: 'Slower, cleaner.',
        tone: 'cautious',
        workforceEffects: { hire: [{ role: 'developer', count: 2, skill: 62, morale: 70, productivity: 68 }] }
      }),
      d('swh-17-outsource-D', 'swh-17-outsource', 'Use them only for overflow QA', {
        summary: 'Narrow, safer experiment.',
        tone: 'cautious',
        directEffects: { cash: -4000, quality: 5 }
      })
    ]
  },
  {
    _id: 'swh-18-product-vs-services',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'strategic',
    title: 'Product or Keep Selling Hours',
    narrative:
      'You have now built similar CRMs four times. A board-ish advisor says you are "one packaging decision away from a product company." Your pipeline still wants custom.',
    once: true,
    minLevel: 14,
    maxLevel: 28,
    decisions: [
      d('swh-18-product-vs-services-A', 'swh-18-product-vs-services', 'Carve out a product team', {
        summary: 'Bet the company\'s attention.',
        tone: 'bold',
        directEffects: { cash: -20000, brandStrength: 10, operationalCapacity: -8, revenue: -4000 },
        delayedEffects: [
          { triggerLevel: '+8', probability: 0.45, label: 'The product finds its first paying users', effects: { revenue: 14000, cash: 14000, marketShare: 1.2, reputation: 8 } }
        ]
      }),
      d('swh-18-product-vs-services-B', 'swh-18-product-vs-services', 'Stay services — cash is king', {
        summary: 'Focus. Ceiling stays visible.',
        tone: 'cautious',
        directEffects: { employeeMorale: 4, revenue: 4000, brandStrength: -3 }
      }),
      d('swh-18-product-vs-services-C', 'swh-18-product-vs-services', 'Sell a templated "accelerator" offering', {
        summary: 'Hybrid. Operationally messy.',
        tone: 'neutral',
        directEffects: { cash: -8000, revenue: 6000, brandStrength: 6, quality: -2 }
      }),
      d('swh-18-product-vs-services-D', 'swh-18-product-vs-services', 'License your last build back to the original client', {
        summary: 'One-time cash, awkward IP.',
        tone: 'neutral',
        probabilityEffects: [
          pe('licenseIp', 0.5, { cash: 35000, reputation: 4 }, { reputation: -6 }, reputationMod)
        ]
      })
    ]
  },
  {
    _id: 'swh-19-office-expansion',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'strategic',
    title: 'The Office Question Returns',
    narrative:
      'Headcount no longer fits on one Slack huddle and a dining table. A landlord offers 18 months at a "founder rate" that is still a lot of rent.',
    minLevel: 13,
    once: true,
    eligibility: { employees: { gte: 6 } },
    forbidsFlags: { housing: 'none', workMode: 'remote' },
    requiresFlags: { workMode: ['office', 'hybrid'] },
    decisions: [
      d('swh-19-office-expansion-A', 'swh-19-office-expansion', 'Sign the lease', {
        summary: 'Signal. Fixed cost.',
        tone: 'bold',
        professionalismDelta: 2,
        setFlags: { workMode: 'office', housing: 'rent' },
        setProperty: {
          kind: 'rented',
          monthlyCost: 4500,
          rooms: [
            { id: 'room-1', label: 'Founder den', quality: 58, occupantId: null },
            { id: 'room-2', label: 'Build bay', quality: 54, occupantId: null },
            { id: 'room-3', label: 'Quiet room', quality: 52, occupantId: null },
            { id: 'room-4', label: 'Client parlor', quality: 60, occupantId: null }
          ]
        },
        directEffects: { cash: -22000, brandStrength: 10, employeeMorale: 8, reputation: 4 }
      }),
      d('swh-19-office-expansion-B', 'swh-19-office-expansion', 'Flexible coworking for the core team', {
        summary: 'Optionality.',
        tone: 'neutral',
        setFlags: { workMode: 'hybrid', housing: 'coworking' },
        setProperty: {
          kind: 'coworking',
          monthlyCost: 1800,
          rooms: [{ id: 'room-1', label: 'Hot desk', quality: 46, occupantId: null }]
        },
        directEffects: { cash: -6000, employeeMorale: 4, brandStrength: 3 }
      }),
      d('swh-19-office-expansion-C', 'swh-19-office-expansion', 'Remain remote and bank the rent', {
        summary: 'Cash over theater.',
        tone: 'cautious',
        setFlags: { workMode: 'remote', housing: 'none' },
        setProperty: { kind: 'none', monthlyCost: 0, rooms: [] },
        directEffects: { cash: 5000, employeeMorale: -4, brandStrength: -2 }
      }),
      d('swh-19-office-expansion-D', 'swh-19-office-expansion', 'Hot-desk a client-facing showroom only', {
        summary: 'Sales room, not a campus.',
        tone: 'neutral',
        setFlags: { workMode: 'hybrid', housing: 'rent' },
        setProperty: {
          kind: 'rented',
          monthlyCost: 2200,
          rooms: [
            { id: 'room-1', label: 'Showroom', quality: 62, occupantId: null },
            { id: 'room-2', label: 'Hot desk', quality: 48, occupantId: null }
          ]
        },
        directEffects: { cash: -10000, reputation: 5, brandStrength: 6 }
      })
    ]
  },
  {
    _id: 'swh-20-sales-hire',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'employee',
    title: 'Do Founders Still Sell?',
    narrative:
      'You are the closer. That does not scale. A candidate with enterprise logos wants base-heavy compensation and a quota you cannot yet feed.',
    minLevel: 12,
    decisions: [
      d('swh-20-sales-hire-A', 'swh-20-sales-hire', 'Hire the hunter', {
        summary: 'Pipeline up. Culture shift.',
        tone: 'bold',
        directEffects: { cash: -5000, brandStrength: 4 },
        workforceEffects: { hire: [{ role: 'sales', count: 1, skill: 78, morale: 70, productivity: 80 }] },
        delayedEffects: [{ triggerLevel: '+4', probability: 0.6, label: 'The hunter lands a noisy, imperfect deal', effects: { customers: 1, revenue: 10000, cash: 10000, deliveryRisk: 8 } }]
      }),
      d('swh-20-sales-hire-B', 'swh-20-sales-hire', 'Train a junior SDR instead', {
        summary: 'Cheaper. Slower.',
        tone: 'cautious',
        workforceEffects: { hire: [{ role: 'sales', count: 1, skill: 48, morale: 75, productivity: 52 }] },
        directEffects: { brandStrength: 2 }
      }),
      d('swh-20-sales-hire-C', 'swh-20-sales-hire', 'Founder keeps selling', {
        summary: 'No extra payroll. Founder bottleneck.',
        tone: 'cautious',
        directEffects: { operationalCapacity: -6, revenue: 3000, employeeMorale: -3 }
      }),
      d('swh-20-sales-hire-D', 'swh-20-sales-hire', 'Partner with a boutique agency for leads', {
        summary: 'Rev-share instead of salary.',
        tone: 'neutral',
        directEffects: { cash: -4000, reputation: 2 },
        delayedEffects: [{ triggerLevel: '+3', probability: 0.5, label: 'Agency leads convert unevenly', effects: { customers: 1, revenue: 7000, cash: 5000 } }]
      })
    ]
  },
  {
    _id: 'swh-21-bad-review',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'customer',
    title: 'A Public One-Star',
    narrative:
      'A former client posts a long, specific, partly true review. Your best prospect forwards it with a single question mark.',
    minLevel: 10,
    decisions: [
      d('swh-21-bad-review-A', 'swh-21-bad-review', 'Reply in public, calmly and specifically', {
        summary: 'Transparency theater that can work.',
        tone: 'bold',
        probabilityEffects: [
          pe('publicReply', 0.64, { reputation: 6, brandStrength: 4 }, { reputation: -8 }, reputationMod)
        ]
      }),
      d('swh-21-bad-review-B', 'swh-21-bad-review', 'Quietly make it right with the client', {
        summary: 'Cash for silence and a possible update.',
        tone: 'cautious',
        directEffects: { cash: -7000, reputation: 4, employeeMorale: 2 }
      }),
      d('swh-21-bad-review-C', 'swh-21-bad-review', 'Ignore it and over-deliver for everyone else', {
        summary: 'Time is a reputation strategy.',
        tone: 'neutral',
        directEffects: { quality: 4, reputation: -3, brandStrength: 2 }
      }),
      d('swh-21-bad-review-D', 'swh-21-bad-review', 'Ask happy clients for reviews the same week', {
        summary: 'Works if not sleazy.',
        tone: 'neutral',
        probabilityEffects: [pe('reviewDrive', 0.7, { reputation: 5, brandStrength: 5 }, { reputation: -4 }, reputationMod)]
      })
    ]
  },
  {
    _id: 'swh-22-partnership',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'opportunity',
    title: 'A Consultancy Wants a White-Label Partner',
    narrative:
      'A larger firm will feed you work if you wear their badge. Volume is real. Your name disappears from the work.',
    minLevel: 14,
    decisions: [
      d('swh-22-partnership-A', 'swh-22-partnership', 'Sign as white-label capacity', {
        summary: 'Revenue, no brand.',
        tone: 'neutral',
        directEffects: { revenue: 12000, cash: 10000, brandStrength: -6, operationalCapacity: -8, customers: 2 }
      }),
      d('swh-22-partnership-B', 'swh-22-partnership', 'Insist on co-branded delivery', {
        summary: 'Harder to close. Better asset.',
        tone: 'bold',
        probabilityEffects: [
          pe('cobrand', 0.48, { revenue: 8000, cash: 8000, brandStrength: 8, reputation: 5, customers: 1 }, { reputation: -2 }, reputationMod)
        ]
      }),
      d('swh-22-partnership-C', 'swh-22-partnership', 'Decline — we build our own name', {
        summary: 'Pride has a burn rate.',
        tone: 'cautious',
        directEffects: { brandStrength: 6, employeeMorale: 5 }
      }),
      d('swh-22-partnership-D', 'swh-22-partnership', 'Pilot one project with an exit clause', {
        summary: 'Learn their operating system.',
        tone: 'neutral',
        directEffects: { cash: 6000, revenue: 4000, brandStrength: -2 }
      })
    ]
  },
  {
    _id: 'swh-23-investor-chat',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'financial',
    title: 'An Angel Wants a Coffee',
    narrative:
      'A former operator liked your case study. They talk about a $150k check for 12%. Your accountant talks about control.',
    once: true,
    minLevel: 15,
    maxLevel: 30,
    decisions: [
      d('swh-23-investor-chat-A', 'swh-23-investor-chat', 'Take the check', {
        summary: 'Runway and a voice on the shoulder.',
        tone: 'bold',
        directEffects: { cash: 150000, reputation: 6, brandStrength: 8 },
        delayedEffects: [{ triggerLevel: '+6', probability: 0.4, label: 'The angel pushes for faster growth than delivery allows', effects: { employeeMorale: -6, deliveryRisk: 8 } }]
      }),
      d('swh-23-investor-chat-B', 'swh-23-investor-chat', 'Raise less, keep more', {
        summary: '$60k for 5%.',
        tone: 'neutral',
        directEffects: { cash: 60000, reputation: 3, brandStrength: 4 }
      }),
      d('swh-23-investor-chat-C', 'swh-23-investor-chat', 'Stay bootstrap', {
        summary: 'Slower. Yours.',
        tone: 'cautious',
        directEffects: { employeeMorale: 6, brandStrength: 3 }
      }),
      d('swh-23-investor-chat-D', 'swh-23-investor-chat', 'Ask for a customer intro instead of cash', {
        summary: 'Smart if they actually have one.',
        tone: 'neutral',
        probabilityEffects: [
          pe('angelIntro', 0.55, { customers: 1, cash: 20000, revenue: 9000, reputation: 6 }, { reputation: 0 }, reputationMod)
        ]
      })
    ]
  },
  {
    _id: 'swh-24-missed-deadline',
    phaseEligible: ['survival', 'early-growth', 'expansion'],
    category: 'crisis',
    title: 'The Date You Promised',
    narrative:
      'Go-live was Tuesday. It is Thursday. The client CC\'d their CEO. Your PM is writing an apology in the parking lot.',
    eventPoolIds: ['delivery-strain'],
    minLevel: 8,
    decisions: [
      d('swh-24-missed-deadline-A', 'swh-24-missed-deadline', 'Own it and offer a credit', {
        summary: 'Cash and pride, relationship salvage.',
        tone: 'cautious',
        directEffects: { cash: -10000, reputation: 2, employeeMorale: -4 }
      }),
      d('swh-24-missed-deadline-B', 'swh-24-missed-deadline', 'Staff a war room and ship a slice', {
        summary: 'Heroics.',
        tone: 'bold',
        directEffects: { employeeMorale: -8, quality: -3, reputation: 4, cash: -4000 },
        hiddenEffects: { technicalDebt: 8 }
      }),
      d('swh-24-missed-deadline-C', 'swh-24-missed-deadline', 'Blame scope changes (partly true)', {
        summary: 'Legalish. Ugly.',
        tone: 'risky',
        directEffects: { reputation: -10, employeeMorale: -6, cash: 0 }
      }),
      d('swh-24-missed-deadline-D', 'swh-24-missed-deadline', 'Bring a senior contractor to finish', {
        summary: 'Pay to stop the bleeding.',
        tone: 'neutral',
        directEffects: { cash: -16000, reputation: 5, quality: 4 }
      })
    ]
  },
  {
    _id: 'swh-25-training',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'employee',
    title: 'A Training Budget Appears',
    narrative:
      'Juniors are shipping, slowly. A conference, certifications, and a paid mentor would cost about one small project\'s profit.',
    minLevel: 11,
    decisions: [
      d('swh-25-training-A', 'swh-25-training', 'Fund a real learning program', {
        summary: 'Capability compounds.',
        tone: 'bold',
        directEffects: { cash: -12000, employeeMorale: 10, quality: 6 },
        delayedEffects: [{ triggerLevel: '+5', probability: 0.7, label: 'Skill lift shows up in delivery', effects: { quality: 5, operationalCapacity: 6 } }]
      }),
      d('swh-25-training-B', 'swh-25-training', 'Lunch-and-learns only', {
        summary: 'Cheap signal.',
        tone: 'cautious',
        directEffects: { cash: -1500, employeeMorale: 4, quality: 2 }
      }),
      d('swh-25-training-C', 'swh-25-training', 'Hire seniors instead of training juniors', {
        summary: 'Buy skill on the market.',
        tone: 'neutral',
        workforceEffects: { hire: [{ role: 'developer', count: 1, skill: 80, morale: 62, productivity: 82 }] },
        directEffects: { employeeMorale: -3 }
      }),
      d('swh-25-training-D', 'swh-25-training', 'Skip it — billable hours first', {
        summary: 'Today\'s P&L. Tomorrow\'s attrition.',
        tone: 'risky',
        directEffects: { revenue: 3000, employeeMorale: -8 }
      })
    ]
  },
  {
    _id: 'swh-26-prod-bug',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'crisis',
    title: 'A Bug With a Dollar Sign',
    narrative:
      'A rounding error double-charged 40 customers. The client\'s finance team is not interested in your explanation of floating point.',
    minLevel: 12,
    decisions: [
      d('swh-26-prod-bug-A', 'swh-26-prod-bug', 'Refund, fix, and publish a postmortem', {
        summary: 'Costly adult behavior.',
        tone: 'cautious',
        directEffects: { cash: -14000, reputation: 6, quality: 5, employeeMorale: 3 }
      }),
      d('swh-26-prod-bug-B', 'swh-26-prod-bug', 'Quiet refunds, no postmortem', {
        summary: 'Less theater. Less learning.',
        tone: 'neutral',
        directEffects: { cash: -9000, reputation: 1, quality: 2 }
      }),
      d('swh-26-prod-bug-C', 'swh-26-prod-bug', 'Argue it was user error', {
        summary: 'You might win the email and lose the industry.',
        tone: 'risky',
        directEffects: { reputation: -16, customers: -1, employeeMorale: -8 }
      }),
      d('swh-26-prod-bug-D', 'swh-26-prod-bug', 'Add a senior QA and a staging gate', {
        summary: 'Process after pain.',
        tone: 'bold',
        directEffects: { cash: -7000, quality: 8 },
        workforceEffects: { hire: [{ role: 'qa', count: 1, skill: 74, morale: 68, productivity: 76 }] }
      })
    ]
  },
  {
    _id: 'swh-27-retainer',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'opportunity',
    title: 'Someone Asks for a Retainer',
    narrative:
      'A client is tired of project theater. They want a monthly team on tap. Predictable cash — if you do not staff it with heroes.',
    minLevel: 13,
    decisions: [
      d('swh-27-retainer-A', 'swh-27-retainer', 'Sell a proper retained squad', {
        summary: 'Recurring revenue. Capacity lock.',
        tone: 'bold',
        directEffects: { revenue: 16000, cash: 16000, customers: 1, operationalCapacity: -12, marketShare: 0.4 }
      }),
      d('swh-27-retainer-B', 'swh-27-retainer', 'Smaller care-and-feeding retainer', {
        summary: 'Safer lock-in.',
        tone: 'cautious',
        directEffects: { revenue: 7000, cash: 7000, reputation: 3 }
      }),
      d('swh-27-retainer-C', 'swh-27-retainer', 'Stay project-only', {
        summary: 'Flexibility over smoothness.',
        tone: 'neutral',
        directEffects: { employeeMorale: 3 }
      }),
      d('swh-27-retainer-D', 'swh-27-retainer', 'Retainer plus a success bonus', {
        summary: 'Aligned, complex.',
        tone: 'neutral',
        probabilityEffects: [
          pe('successBonus', 0.58, { cash: 22000, revenue: 12000, reputation: 5 }, { cash: 8000, revenue: 6000, reputation: -2 }, reputationMod)
        ]
      })
    ]
  },
  {
    _id: 'swh-28-process',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'strategic',
    title: 'Process or Chaos',
    narrative:
      'You are large enough that "just Slack me" is now a production incident. A candidate PM wants to install rituals. Engineers roll their eyes.',
    minLevel: 16,
    decisions: [
      d('swh-28-process-A', 'swh-28-process', 'Hire the PM and install a lightweight process', {
        summary: 'Professionalization tax.',
        tone: 'bold',
        workforceEffects: { hire: [{ role: 'pm', count: 1, skill: 76, morale: 70, productivity: 74 }] },
        directEffects: { quality: 5, employeeMorale: -3, operationalCapacity: 4 }
      }),
      d('swh-28-process-B', 'swh-28-process', 'Keep founder-as-traffic-cop', {
        summary: 'Works until it does not.',
        tone: 'risky',
        directEffects: { operationalCapacity: -6, employeeMorale: -4, quality: -2 }
      }),
      d('swh-28-process-C', 'swh-28-process', 'Adopt process without a new hire', {
        summary: 'Meetings without a owner.',
        tone: 'neutral',
        directEffects: { employeeMorale: -6, quality: 3, operationalCapacity: 2 }
      }),
      d('swh-28-process-D', 'swh-28-process', 'Split into two pods with clear owners', {
        summary: 'Structure. Coordination cost.',
        tone: 'bold',
        directEffects: { employeeMorale: 5, quality: 3, monthlyExpenses: 1500, operationalCapacity: 6 }
      })
    ]
  },
  {
    _id: 'swh-29-market-shift',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'market',
    title: 'The Stack Everyone Wants Changed',
    narrative:
      'Prospects now ask about AI features in every discovery call. Your current offers look suddenly old. Training and R&D would steal billable time.',
    minLevel: 15,
    decisions: [
      d('swh-29-market-shift-A', 'swh-29-market-shift', 'Fund an AI capability sprint', {
        summary: 'Stay relevant. Cash and focus.',
        tone: 'bold',
        directEffects: { cash: -18000, brandStrength: 10, quality: 3, revenue: -3000 },
        delayedEffects: [{ triggerLevel: '+5', probability: 0.55, label: 'AI packaging wins a modern client', effects: { customers: 1, revenue: 12000, cash: 12000, marketShare: 0.8 } }]
      }),
      d('swh-29-market-shift-B', 'swh-29-market-shift', 'Partner with a specialist instead of building', {
        summary: 'Faster offer, thinner margin.',
        tone: 'neutral',
        directEffects: { cash: -5000, reputation: 3, revenue: 4000, brandStrength: 4 }
      }),
      d('swh-29-market-shift-C', 'swh-29-market-shift', 'Ignore the hype — deliver boring systems well', {
        summary: 'Positioning as the adult in the room.',
        tone: 'cautious',
        directEffects: { brandStrength: 2, reputation: 2, quality: 4 }
      }),
      d('swh-29-market-shift-D', 'swh-29-market-shift', 'Rebrand overnight around AI', {
        summary: 'Loud. Easy to smell.',
        tone: 'risky',
        directEffects: { cash: -8000, brandStrength: 6, reputation: -4 },
        probabilityEffects: [pe('aibrand', 0.4, { customers: 2, revenue: 9000 }, { reputation: -8 }, reputationMod)]
      })
    ]
  },
  {
    _id: 'swh-30-acquisition-nibble',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'strategic',
    title: 'Someone Wants to Buy a Piece',
    narrative:
      'A regional IT group offers to acquire 30% and fold you into their delivery machine. The number is flattering. The culture fit is not obviously real.',
    once: true,
    minLevel: 20,
    maxLevel: 40,
    decisions: [
      d('swh-30-acquisition-nibble-A', 'swh-30-acquisition-nibble', 'Sell the stake', {
        summary: 'Cash and a boss.',
        tone: 'bold',
        directEffects: { cash: 180000, reputation: 8, brandStrength: -8, employeeMorale: -8, marketShare: 1.5 }
      }),
      d('swh-30-acquisition-nibble-B', 'swh-30-acquisition-nibble', 'Decline and use the offer as a valuation story', {
        summary: 'Pride as a marketing asset.',
        tone: 'cautious',
        directEffects: { reputation: 6, brandStrength: 8, employeeMorale: 6 }
      }),
      d('swh-30-acquisition-nibble-C', 'swh-30-acquisition-nibble', 'Counter: revenue-share partnership, no equity', {
        summary: 'Keep the company. Share the pipe.',
        tone: 'neutral',
        probabilityEffects: [
          pe('revShare', 0.5, { revenue: 14000, cash: 14000, customers: 2 }, { reputation: -2 }, reputationMod)
        ]
      }),
      d('swh-30-acquisition-nibble-D', 'swh-30-acquisition-nibble', 'Ask for a full acquisition number (you may not like it)', {
        summary: 'Information. Distraction.',
        tone: 'risky',
        probabilityEffects: [
          pe('fullBuy', 0.3, { cash: 400000, reputation: 10 }, { employeeMorale: -6, reputation: 2 }, reputationMod)
        ]
      })
    ]
  },
  {
    _id: 'swh-31-tax-notice',
    phaseEligible: ['survival', 'early-growth', 'expansion'],
    category: 'regulatory',
    title: 'A Letter From the Tax Office',
    narrative:
      'It is not an audit yet. It is the kind of letter that becomes one if you are sloppy. Your books are "founder-grade."',
    minLevel: 8,
    decisions: [
      d('swh-31-tax-notice-A', 'swh-31-tax-notice', 'Hire a real accountant immediately', {
        summary: 'Pay for sleep.',
        tone: 'cautious',
        directEffects: { cash: -9000, monthlyExpenses: 1200, reputation: 2 }
      }),
      d('swh-31-tax-notice-B', 'swh-31-tax-notice', 'Founder files a careful response', {
        summary: 'Cheap. Imperfect.',
        tone: 'risky',
        probabilityEffects: [
          pe('taxReply', 0.62, { cash: -2000 }, { cash: -18000, reputation: -6 }, reputationMod)
        ]
      }),
      d('swh-31-tax-notice-C', 'swh-31-tax-notice', 'Provision cash and wait', {
        summary: 'Conservative, slow.',
        tone: 'neutral',
        directEffects: { cash: -6000 }
      }),
      d('swh-31-tax-notice-D', 'swh-31-tax-notice', 'Ignore until they knock louder', {
        summary: 'Almost never the move.',
        tone: 'risky',
        delayedEffects: [{ triggerLevel: '+5', probability: 0.7, label: 'The tax issue becomes a penalty', effects: { cash: -25000, reputation: -8 } }]
      })
    ]
  },
  {
    _id: 'swh-32-random-grant',
    phaseEligible: ['survival', 'early-growth'],
    category: 'random',
    title: 'A Tiny Innovation Grant',
    narrative:
      'A government portal you forgot you registered on offers a modest matching grant if you spend it on tooling and training — with paperwork.',
    minLevel: 5,
    maxLevel: 20,
    decisions: [
      d('swh-32-random-grant-A', 'swh-32-random-grant', 'Take it and do the paperwork', {
        summary: 'Free-ish money with friction.',
        tone: 'neutral',
        directEffects: { cash: 12000, operationalCapacity: -4, quality: 3 }
      }),
      d('swh-32-random-grant-B', 'swh-32-random-grant', 'Skip — the admin will cost more than it pays', {
        summary: 'Focus.',
        tone: 'cautious',
        directEffects: { employeeMorale: 2 }
      }),
      d('swh-32-random-grant-C', 'swh-32-random-grant', 'Take it and over-claim a bit', {
        summary: 'Bad idea with a long fuse.',
        tone: 'risky',
        directEffects: { cash: 18000 },
        delayedEffects: [{ triggerLevel: '+8', probability: 0.35, label: 'Grant compliance review', effects: { cash: -22000, reputation: -12 } }]
      }),
      d('swh-32-random-grant-D', 'swh-32-random-grant', 'Use it strictly for training', {
        summary: 'Aligned with the spirit of the program.',
        tone: 'cautious',
        directEffects: { cash: 8000, employeeMorale: 6, quality: 4 }
      })
    ]
  },
  {
    _id: 'swh-remote-client-address',
    phaseEligible: ['survival', 'early-growth'],
    category: 'customer',
    title: 'They Want a Real Address',
    narrative:
      'A prospect asks for a registered office, not a Google Meet link. You chose remote. This is the bill coming due — not a landlord invoice.',
    requiresFlags: { housing: 'none' },
    repeatable: true,
    minLevel: 4,
    maxLevel: 28,
    decisions: [
      d('swh-remote-client-address-A', 'swh-remote-client-address', 'Take a coworking membership', {
        summary: 'An address without a lease.',
        tone: 'neutral',
        setFlags: { workMode: 'hybrid', housing: 'coworking' },
        setProperty: { kind: 'coworking', monthlyCost: 1600, rooms: [{ id: 'room-1', label: 'Hot desk', quality: 45, occupantId: null }] },
        directEffects: { cash: -4000, reputation: 4, brandStrength: 3 }
      }),
      d('swh-remote-client-address-B', 'swh-remote-client-address', 'Use a virtual office and stay remote', {
        summary: 'Cheap signal. Thin if they visit.',
        tone: 'cautious',
        professionalismDelta: -1,
        directEffects: { cash: -1200, monthlyExpenses: 200, reputation: 1 }
      }),
      d('swh-remote-client-address-C', 'swh-remote-client-address', 'Walk — clients who need carpet are not ours', {
        summary: 'Protect the remote bet.',
        tone: 'bold',
        professionalismDelta: 2,
        directEffects: { brandStrength: 3, customers: 0, employeeMorale: 3 }
      }),
      d('swh-remote-client-address-D', 'swh-remote-client-address', 'Rent a small studio after all', {
        summary: 'Reverse the founding bet.',
        tone: 'bold',
        setFlags: { workMode: 'office', housing: 'rent' },
        setProperty: {
          kind: 'rented',
          monthlyCost: 3200,
          rooms: [
            { id: 'room-1', label: 'Studio', quality: 52, occupantId: null },
            { id: 'room-2', label: 'Meeting nook', quality: 50, occupantId: null }
          ]
        },
        directEffects: { cash: -14000, reputation: 5, employeeMorale: 6 }
      })
    ]
  },
  {
    _id: 'swh-home-office-strain',
    phaseEligible: ['survival', 'early-growth'],
    category: 'employee',
    title: 'Kitchen-Table Burnout',
    narrative:
      'Amina mentions her roommate’s band practices during standups. Remote is cheap. It is also someone else’s living room.',
    requiresFlags: { workMode: 'remote' },
    forbidsFlags: { housing: ['rent', 'own'] },
    repeatable: true,
    minLevel: 3,
    maxLevel: 22,
    decisions: [
      d('swh-home-office-strain-A', 'swh-home-office-strain', 'Stipend for proper desks and internet', {
        summary: 'Cash for dignity.',
        tone: 'cautious',
        professionalismDelta: 3,
        directEffects: { cash: -6000, monthlyExpenses: 400, employeeMorale: 8, quality: 3 }
      }),
      d('swh-home-office-strain-B', 'swh-home-office-strain', 'Ignore it — everyone is remote these days', {
        summary: 'Saves money. Spends goodwill.',
        tone: 'risky',
        professionalismDelta: -4,
        directEffects: { employeeMorale: -10, quality: -3 }
      }),
      d('swh-home-office-strain-C', 'swh-home-office-strain', 'Trial a coworking two days a week', {
        summary: 'Halfway house.',
        tone: 'neutral',
        setFlags: { workMode: 'hybrid', housing: 'coworking' },
        setProperty: { kind: 'coworking', monthlyCost: 1400 },
        setProperty: {
          kind: 'coworking',
          monthlyCost: 1400,
          rooms: [{ id: 'room-1', label: 'Hot desk', quality: 44, occupantId: null }]
        },
        directEffects: { cash: -3500, employeeMorale: 5 }
      }),
      d('swh-home-office-strain-D', 'swh-home-office-strain', 'Let people expense cafes with a cap', {
        summary: 'Flexible, messy receipts.',
        tone: 'neutral',
        directEffects: { cash: -2000, monthlyExpenses: 500, employeeMorale: 4 }
      })
    ]
  },
  {
    _id: 'swh-fuel-card-abuse',
    phaseEligible: ['early-growth', 'expansion'],
    category: 'employee',
    title: 'The Fuel Card Story',
    narrative:
      'Unlimited fuel sounded generous. Finance found weekend trips coded as “client visits.” Policy is culture with a receipt.',
    requiresFlags: { fuelPolicy: 'unlimited' },
    repeatable: true,
    minLevel: 8,
    decisions: [
      d('swh-fuel-card-abuse-A', 'swh-fuel-card-abuse', 'Cap it and publish the rule', {
        summary: 'Adult policy.',
        tone: 'cautious',
        professionalismDelta: 4,
        setFlags: { fuelPolicy: 'capped' },
        directEffects: { employeeMorale: -4, monthlyExpenses: -400 }
      }),
      d('swh-fuel-card-abuse-B', 'swh-fuel-card-abuse', 'Fire the offender in public', {
        summary: 'Deterrence theater.',
        tone: 'risky',
        professionalismDelta: -3,
        directEffects: { employeeMorale: -12, reputation: -2 }
      }),
      d('swh-fuel-card-abuse-C', 'swh-fuel-card-abuse', 'Keep unlimited — trust until you cannot', {
        summary: 'Culture of faith.',
        tone: 'bold',
        professionalismDelta: -2,
        directEffects: { employeeMorale: 3, monthlyExpenses: 300 }
      }),
      d('swh-fuel-card-abuse-D', 'swh-fuel-card-abuse', 'Remove fuel entirely', {
        summary: 'Cheapest. Coldest.',
        tone: 'cautious',
        setFlags: { fuelPolicy: 'none' },
        directEffects: { employeeMorale: -8, monthlyExpenses: -800 }
      })
    ]
  },
  {
    _id: 'swh-critical-turnaround',
    phaseEligible: ['survival', 'early-growth', 'expansion', 'professionalization'],
    category: 'crisis',
    title: 'Critical State — Turnaround Window',
    narrative:
      'The company is in a critical state. You have one window to attempt a recovery before the game records a failure. Choose the least-bad lever.',
    isCritical: true,
    once: false,
    minLevel: 1,
    maxLevel: 100,
    decisions: [
      d('swh-critical-A', 'swh-critical-turnaround', 'Emergency loan', {
        summary: 'Cash now. Heavy debt.',
        tone: 'risky',
        directEffects: { cash: 60000, debt: 75000, reputation: -2 }
      }),
      d('swh-critical-B', 'swh-critical-turnaround', 'Debt restructuring', {
        summary: 'Breathe. Credibility haircut.',
        tone: 'cautious',
        directEffects: { debt: -25000, cash: 8000, reputation: -4, monthlyExpenses: -500 }
      }),
      d('swh-critical-C', 'swh-critical-turnaround', 'Layoffs', {
        summary: 'Cut burn. Cut capability.',
        tone: 'risky',
        directEffects: { cash: 5000, employeeMorale: -18, reputation: -8, operationalCapacity: -15, monthlyExpenses: -8000 },
        workforceEffects: { fire: [{ role: 'developer', count: 1 }] }
      }),
      d('swh-critical-D', 'swh-critical-turnaround', 'Founder emergency investment', {
        summary: 'Personal capital. No new boss.',
        tone: 'bold',
        directEffects: { cash: 40000, employeeMorale: 6, reputation: 2 }
      })
    ]
  }
];

function flatten() {
  const eventDocs = [];
  const decisionDocs = [];
  for (const e of events) {
    const { decisions, ...rest } = e;
    eventDocs.push({
      ...rest,
      industry: 'software-house',
      decisionIds: decisions.map((x) => x._id)
    });
    for (const dec of decisions) {
      decisionDocs.push(dec);
    }
  }
  return { eventDocs, decisionDocs };
}

module.exports = { events, flatten };
