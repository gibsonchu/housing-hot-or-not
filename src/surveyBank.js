// Question bank for the in-product design survey.
// Source: Housing_Design_Survey_Question_Bank.json (v1.0)
//
// `frequency` in the source file is prose ("Every 10–20 votes"). We translate it
// into an expected interval, and weight = 1 / interval, so the sampler naturally
// asks common questions often and rare ones rarely.

const INTERVAL = {
  'After selected votes': 4,
  'Every 10–20 votes': 15,
  Occasional: 25,
  'Every 30–50 votes': 40,
  default: 8,
};

const RAW = {
  'Building Choice': [
    { type: 'Multi-select', prompt: 'What influenced your choice?', max: 3, frequency: 'After selected votes',
      options: ['Better fits neighborhood', 'Better materials', 'Better windows', 'Better proportions', 'Better height', 'Better street presence', 'Better ground floor', 'Better landscaping', 'Feels welcoming', 'Feels timeless', 'Feels modern', 'Feels unique', 'Better overall appearance', 'Other'] },
    { type: 'Single Select', prompt: 'Which feature mattered most?',
      options: ['Materials', 'Height', 'Windows', 'Color', 'Ground floor', 'Overall shape', 'Landscaping', 'Context'] },
    { type: 'Single Select', prompt: 'What feeling best describes the building you selected?',
      options: ['Welcoming', 'Beautiful', 'Comfortable', 'Modern', 'Timeless', 'Community-oriented', 'Human-scale', 'Vibrant', 'Calm'] },
    { type: 'Single Select', prompt: "What feeling best describes the building you didn't select?",
      options: ['Too bulky', 'Too plain', 'Too modern', "Doesn't fit", 'Too tall', 'Too industrial', 'Uninviting', 'Generic', 'Other'] },
  ],
  Materials: [
    { type: 'Pairwise', prompt: 'Which facade would you rather see?', options: ['Brick', 'Stone'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which facade would you rather see?', options: ['Brick', 'Metal'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which facade would you rather see?', options: ['Brick', 'Concrete'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which facade would you rather see?', options: ['Concrete', 'Glass'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which facade would you rather see?', options: ['Stone', 'Panels'], frequency: 'Every 10–20 votes', elo: true },
  ],
  'Window Styles': [
    { type: 'Pairwise', prompt: 'Which window style feels better?', options: ['Small', 'Medium'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which window style feels better?', options: ['Medium', 'Large'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which window style feels better?', options: ['Large', 'Floor-to-ceiling'], frequency: 'Every 10–20 votes', elo: true },
  ],
  'Ground Floor': [
    { type: 'Pairwise', prompt: 'Which street experience would you rather have?', options: ['Retail', 'Residential lobby'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which street experience would you rather have?', options: ['Community facility', 'Retail'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which street experience would you rather have?', options: ['Walk-up entrances', 'Lobby entrance'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which street experience would you rather have?', options: ['Retail', 'Blank wall'], frequency: 'Every 10–20 votes', elo: true },
    { type: 'Pairwise', prompt: 'Which street experience would you rather have?', options: ['Community space', 'Blank wall'], frequency: 'Every 10–20 votes', elo: true },
  ],
  // Options are the two buildings just voted on — substituted at ask time.
  'Neighborhood Context': [
    { type: 'Pairwise', prompt: 'Which building better fits your neighborhood?', options: ['Building A', 'Building B'], frequency: 'Occasional', pair: true },
    { type: 'Pairwise', prompt: 'Which building feels more like it belongs here?', options: ['Building A', 'Building B'], frequency: 'Occasional', pair: true },
    { type: 'Pairwise', prompt: 'Which building would age better?', options: ['Building A', 'Building B'], frequency: 'Occasional', pair: true },
    { type: 'Pairwise', prompt: 'Which building feels more welcoming?', options: ['Building A', 'Building B'], frequency: 'Occasional', pair: true },
    { type: 'Pairwise', prompt: 'Which building would you rather walk past every day?', options: ['Building A', 'Building B'], frequency: 'Occasional', pair: true },
  ],
  'Housing Tradeoffs': [
    { type: 'Single Select', prompt: 'Would you support a taller building if it meant more affordable homes?', options: ['Yes', 'No', 'Depends'] },
    { type: 'Multi-select', prompt: "If you answered 'Depends', what would influence your decision?",
      options: ['Better architecture', 'More affordable homes', 'More family-sized units', 'Better public space', 'Better retail', 'Better transit', 'Less shadow', 'Better materials'] },
    { type: 'Single Select', prompt: 'Would you rather have...', options: ['More homes', 'Better design', 'Both equally'] },
    { type: 'Pairwise', prompt: 'Which matters more?', options: ['Beautiful architecture', 'Lower housing costs'], elo: true },
    { type: 'Single Select', prompt: 'Would you accept a taller building if it fit the neighborhood well?', options: ['Yes', 'No', 'Depends'] },
  ],
  'Design Priorities': [
    'Neighborhood fit', 'Affordable units', 'Energy efficiency', 'Family-sized apartments', 'Ground-floor activity',
    'Natural light', 'Walkability', 'Street trees', 'Public open space', 'Architectural variety',
  ].map((t) => ({ type: 'Rating Scale', prompt: 'How important is ' + t + '?', subject: t, options: ['Not Important', 'Somewhat Important', 'Very Important'] })),
  'Open Response': [
    'Finish the sentence: A great apartment building should...',
    'What makes a building feel welcoming?',
    'What makes a building feel out of place?',
    'What is one thing you wish new housing included more often?',
    'Describe a building in your neighborhood that you love.',
    'Describe a building you dislike and why.',
    'What should architects pay more attention to?',
  ].map((p) => ({ type: 'Free Text', prompt: p, options: [], frequency: 'Every 30–50 votes' })),
  'Personal Preferences': [
    { type: 'Single Select', prompt: 'Which style do you generally prefer?', options: ['Traditional', 'Modern', 'Mix'] },
    { type: 'Single Select', prompt: 'Which scale feels best?', options: ['Low-rise', 'Mid-rise', 'High-rise'] },
    { type: 'Multi-select', prompt: 'Which materials do you generally like?', options: ['Brick', 'Stone', 'Concrete', 'Metal', 'Glass', 'Wood'] },
    { type: 'Multi-select', prompt: 'Which streets feel nicest?', options: ['Mostly residential', 'Mixed-use', 'Commercial', 'Tree-lined', 'Historic', 'Modern'] },
  ],
  'Civic Participation': [
    { type: 'Single Select', prompt: 'Would you like more opportunities to shape housing design in your neighborhood?', options: ['Yes', 'No', 'Maybe'] },
    { type: 'Multi-select', prompt: 'How would you prefer to participate?', options: ['Vote on designs', 'Answer quick surveys', 'Attend workshops', 'Attend meetings', 'Submit comments', 'View community results'] },
    { type: 'Single Select', prompt: 'How familiar are you with architecture?', options: ['Not at all', 'Somewhat', 'Very'] },
    { type: 'Single Select', prompt: 'How involved are you in neighborhood planning?', options: ['Not at all', 'Somewhat', 'Very'] },
  ],
};

export const QUESTIONS = Object.entries(RAW).flatMap(([category, qs]) =>
  qs.map((q, i) => ({
    ...q,
    id: category.toLowerCase().replace(/\s+/g, '-') + '-' + i,
    category,
    weight: 1 / (INTERVAL[q.frequency] || INTERVAL.default),
  }))
);

export const CATEGORIES = Object.keys(RAW);

// The recurring identity question. Not part of the bank — injected on every
// second survey so answers can be segmented by where people actually live.
export const NEIGHBORHOOD_QUESTION = {
  id: 'your-neighborhood',
  category: 'About You',
  type: 'Neighborhood',
  prompt: 'What neighborhood are you from?',
  options: [],
};

/**
 * Weighted random pick from the questions not yet in `exclude`. Returns null
 * once the bank is exhausted — every question is asked at most once.
 */
export function pickQuestion(exclude = []) {
  const list = QUESTIONS.filter((q) => exclude.indexOf(q.id) === -1);
  if (!list.length) return null;
  const total = list.reduce((a, q) => a + q.weight, 0);
  let r = Math.random() * total;
  for (const q of list) {
    r -= q.weight;
    if (r <= 0) return q;
  }
  return list[list.length - 1];
}

export const NYC_NEIGHBORHOODS = [
  // Manhattan
  'Battery Park City', 'Financial District', 'Tribeca', 'Chinatown', 'Lower East Side', 'East Village',
  'Greenwich Village', 'West Village', 'SoHo', 'NoHo', 'Little Italy', 'Chelsea', 'Flatiron', 'Gramercy',
  'Kips Bay', 'Murray Hill', "Hell's Kitchen", 'Midtown', 'Times Square', 'Turtle Bay', 'Sutton Place',
  'Upper East Side', 'Yorkville', 'Lenox Hill', 'Carnegie Hill', 'Upper West Side', 'Lincoln Square',
  'Manhattan Valley', 'Morningside Heights', 'Central Harlem', 'East Harlem', 'West Harlem', 'Hamilton Heights',
  'Washington Heights', 'Inwood', 'Roosevelt Island', 'Stuyvesant Town',
  // Brooklyn
  'Greenpoint', 'Williamsburg', 'Bushwick', 'Bedford-Stuyvesant', 'Crown Heights', 'Prospect Heights',
  'Park Slope', 'Gowanus', 'Carroll Gardens', 'Cobble Hill', 'Boerum Hill', 'Brooklyn Heights', 'DUMBO',
  'Downtown Brooklyn', 'Fort Greene', 'Clinton Hill', 'Prospect Lefferts Gardens', 'Flatbush', 'East Flatbush',
  'Ditmas Park', 'Kensington', 'Windsor Terrace', 'Sunset Park', 'Bay Ridge', 'Dyker Heights', 'Bensonhurst',
  'Borough Park', 'Midwood', 'Sheepshead Bay', 'Brighton Beach', 'Coney Island', 'Gravesend', 'Marine Park',
  'Canarsie', 'East New York', 'Brownsville', 'Cypress Hills', 'Bergen Beach', 'Red Hook', 'Greenwood Heights',
  // Queens
  'Astoria', 'Long Island City', 'Sunnyside', 'Woodside', 'Jackson Heights', 'Elmhurst', 'Corona',
  'Rego Park', 'Forest Hills', 'Kew Gardens', 'Richmond Hill', 'Woodhaven', 'Ozone Park', 'Howard Beach',
  'Ridgewood', 'Maspeth', 'Middle Village', 'Glendale', 'Flushing', 'Whitestone', 'College Point', 'Bayside',
  'Douglaston', 'Little Neck', 'Fresh Meadows', 'Jamaica', 'Jamaica Estates', 'Hollis', 'Queens Village',
  'St. Albans', 'Laurelton', 'Rosedale', 'Springfield Gardens', 'Far Rockaway', 'Rockaway Beach', 'Broad Channel',
  // Bronx
  'Mott Haven', 'Port Morris', 'Melrose', 'Hunts Point', 'Longwood', 'Concourse', 'Highbridge', 'Morrisania',
  'Tremont', 'Fordham', 'Belmont', 'University Heights', 'Kingsbridge', 'Riverdale', 'Spuyten Duyvil',
  'Norwood', 'Bedford Park', 'Wakefield', 'Williamsbridge', 'Baychester', 'Co-op City', 'Pelham Bay',
  'Throgs Neck', 'Country Club', 'Castle Hill', 'Soundview', 'Parkchester', 'City Island', 'Morris Park',
  // Staten Island
  'St. George', 'Stapleton', 'Tompkinsville', 'Clifton', 'Port Richmond', 'West Brighton', 'New Brighton',
  'Todt Hill', 'Great Kills', 'Tottenville', 'New Dorp', 'Annadale', 'Eltingville', 'Bulls Head', 'Charleston',
];

export function matchNeighborhoods(q, limit = 6) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const starts = [], contains = [];
  for (const n of NYC_NEIGHBORHOODS) {
    const l = n.toLowerCase();
    if (l.startsWith(s)) starts.push(n);
    else if (l.indexOf(s) !== -1) contains.push(n);
  }
  return starts.concat(contains).slice(0, limit);
}
