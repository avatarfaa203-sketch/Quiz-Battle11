import { Subject, ShsLevel } from '../types';

export interface CurriculumTopic {
  id: string;
  name: string;
  subject: Subject;
  shsLevel: ShsLevel;
  description: string;
}

export interface SubjectMetadata {
  id: Subject;
  name: string;
  icon: string;
  description: string;
  color: string;
  bgGradient: string;
  isCoreScience?: boolean;
}

export const SHS_SUBJECTS: SubjectMetadata[] = [
  {
    id: 'Core Mathematics',
    name: 'Core Mathematics',
    icon: 'Calculator',
    description: 'Algebra, geometry, trigonometry, statistics, modular arithmetic, and probability',
    color: 'text-blue-400',
    bgGradient: 'from-blue-600/20 to-indigo-600/10 border-blue-500/30',
    isCoreScience: true
  },
  {
    id: 'Additional Mathematics',
    name: 'Additional Mathematics',
    icon: 'Sigma',
    description: 'Logarithms, calculus, vectors, coordinate geometry, and kinematics',
    color: 'text-indigo-400',
    bgGradient: 'from-indigo-600/20 to-purple-600/10 border-indigo-500/30',
    isCoreScience: true
  },
  {
    id: 'Physics',
    name: 'Physics',
    icon: 'Zap',
    description: 'Mechanics, wave optics, electricity, atomic physics, and electronics',
    color: 'text-amber-400',
    bgGradient: 'from-amber-600/20 to-orange-600/10 border-amber-500/30',
    isCoreScience: true
  },
  {
    id: 'Chemistry',
    name: 'Chemistry',
    icon: 'FlaskConical',
    description: 'Stoichiometry, periodic trends, chemical equilibrium, and organic chemistry',
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/30',
    isCoreScience: true
  },
  {
    id: 'Biology',
    name: 'Biology',
    icon: 'Dna',
    description: 'Cytology, physiology, genetics, ecology, and anatomy',
    color: 'text-green-400',
    bgGradient: 'from-green-600/20 to-emerald-600/10 border-green-500/30',
    isCoreScience: true
  },
  {
    id: 'Computing',
    name: 'Computing & ICT',
    icon: 'Cpu',
    description: 'Algorithms, data structures, network security, and computer systems',
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-600/20 to-blue-600/10 border-cyan-500/30',
    isCoreScience: false
  },
  {
    id: 'English',
    name: 'English Language',
    icon: 'BookOpen',
    description: 'Grammar structures, vocabulary, rhetoric, and literary devices',
    color: 'text-rose-400',
    bgGradient: 'from-rose-600/20 to-pink-600/10 border-rose-500/30',
    isCoreScience: false
  },
  {
    id: 'General Knowledge',
    name: 'General Science & History',
    icon: 'Globe',
    description: 'Scientific discoveries, world geography, inventions, and history',
    color: 'text-purple-400',
    bgGradient: 'from-purple-600/20 to-violet-600/10 border-purple-500/30',
    isCoreScience: false
  }
];

export const GHANA_SHS_CURRICULUM: Record<Subject, Record<ShsLevel, string[]>> = {
  'Core Mathematics': {
    'SHS 1': [
      'Real Number Systems',
      'Algebraic Expressions & Factorisation',
      'Linear Equations & Inequalities',
      'Plane Geometry & Polygons',
      'Sets & Venn Diagrams',
      'Ratios, Rates & Proportions'
    ],
    'SHS 2': [
      'Quadratic Functions & Equations',
      'Indices & Standard Form',
      'Commercial Mathematics (Interest & Depreciation)',
      'Statistics (Central Tendency & Dispersion)',
      'Modular Arithmetic',
      'Trigonometry (Sine/Cosine Rules & Elevations)'
    ],
    'SHS 3': [
      'Circle Theorems & Chords',
      'Mensuration (Perimeters, Areas & Volumes)',
      'Vectors in 2D & Bearings',
      'Probability & Tree Diagrams',
      'Geometric Transformations',
      'Sequences & Series (AP & GP)'
    ]
  },
  'Additional Mathematics': {
    'SHS 1': [
      'Sets and Binary Operations',
      'Functions & Mappings',
      'Surds and Polynomials',
      'Linear & Quadratic Inequalities',
      'Circular Measure & Radians'
    ],
    'SHS 2': [
      'Logarithms & Exponential Equations',
      'Trigonometric Functions & Identities',
      'Binomial Theorem',
      'Coordinate Geometry of the Circle',
      'Matrices & Linear Transformations',
      'Vectors in 2D'
    ],
    'SHS 3': [
      'Differential Calculus & Tangents',
      'Integral Calculus & Area Under Curves',
      'Permutations & Combinations',
      'Probability Distributions (Binomial & Normal)',
      'Mechanics: Kinematics & Dynamics'
    ]
  },
  'Physics': {
    'SHS 1': [
      'Physical Quantities, Units & Dimensions',
      'Rectilinear Kinematics (Motion in a Straight Line)',
      'Newton’s Laws of Motion & Momentum',
      'Work, Energy and Power',
      'Thermal Physics & Temperature Scales'
    ],
    'SHS 2': [
      'Hydrostatics, Pressure & Flotation',
      'Wave Motion & Sound Acoustics',
      'Reflection, Refraction & Optical Instruments',
      'Electrostatics & Coulomb’s Law',
      'Direct Current (DC) Circuits & Ohm’s Law',
      'Magnetic Fields & Electromagnetic Forces'
    ],
    'SHS 3': [
      'Electromagnetic Induction & Faraday’s Laws',
      'Alternating Current (AC) Circuits',
      'Atomic & Nuclear Physics (Radioactivity & Half-life)',
      'Semiconductor Electronics & Logic Gates',
      'Energy Degradation & Conservation'
    ]
  },
  'Chemistry': {
    'SHS 1': [
      'Particulate Nature of Matter & States of Matter',
      'Atomic Structure, Isotopy & Electronic Configuration',
      'Chemical Bonding (Ionic, Covalent & Metallic)',
      'Gas Laws (Boyle’s, Charles’s & Ideal Gas Law)',
      'Stoichiometry & The Mole Concept',
      'Acids, Bases, Salts and pH Scale'
    ],
    'SHS 2': [
      'Redox Reactions & Oxidation States',
      'Electrochemistry & Voltaic Cells',
      'Chemical Energetics & Enthalpy Changes',
      'Reaction Rates & Chemical Equilibrium',
      'Hydrocarbons: Alkanes, Alkenes & Alkynes',
      'Periodic Chemistry of Groups & Periods'
    ],
    'SHS 3': [
      'Organic Functional Groups (Alcohols, Acids, Esters)',
      'Transition Metals & Extraction of Metals',
      'Qualitative Analysis (Identification of Cations & Anions)',
      'Industrial Chemistry (Haber & Contact Processes)',
      'Environmental Chemistry & Pollution Control'
    ]
  },
  'Biology': {
    'SHS 1': [
      'Introduction to Biology & Scientific Method',
      'Cell Biology, Organelles & Microscopy',
      'Movement of Substances (Diffusion, Osmosis, Plasmolysis)',
      'Autotrophic Nutrition & Photosynthesis',
      'Enzymes & Enzyme Action'
    ],
    'SHS 2': [
      'Transport in Flowering Plants & Mammals',
      'Respiration & Gaseous Exchange',
      'Excretion & Osmoregulation (Kidneys, Nephron)',
      'Nervous & Hormonal Coordination',
      'Plant Tropisms & Growth Hormones',
      'Reproduction in Plants & Mammals'
    ],
    'SHS 3': [
      'Genetics & Heredity (Mendelian Laws & Sex Linkage)',
      'Evolution, Natural Selection & Variation',
      'Ecology, Ecosystems & Energy Pyramids',
      'Conservation & Natural Resource Management',
      'Pathology, Immunity & Infectious Diseases'
    ]
  },
  'Mathematics': {
    'SHS 1': [
      'Real Number Systems',
      'Algebraic Expressions & Factorisation',
      'Linear Equations & Inequalities',
      'Plane Geometry & Polygons',
      'Sets & Venn Diagrams'
    ],
    'SHS 2': [
      'Quadratic Functions & Equations',
      'Indices & Standard Form',
      'Commercial Mathematics (Interest & Depreciation)',
      'Statistics (Central Tendency & Dispersion)',
      'Modular Arithmetic'
    ],
    'SHS 3': [
      'Circle Theorems & Chords',
      'Mensuration (Perimeters, Areas & Volumes)',
      'Vectors in 2D & Bearings',
      'Probability & Tree Diagrams'
    ]
  },
  'Computing': {
    'SHS 1': ['Computer Architecture', 'Operating Systems', 'Word Processing & Spreadsheets'],
    'SHS 2': ['Computer Networks & Protocols', 'Algorithms & Flowcharts', 'Database Management'],
    'SHS 3': ['Programming Fundamentals', 'Cybersecurity & Ethics', 'Web Technologies']
  },
  'English': {
    'SHS 1': ['Grammar: Parts of Speech', 'Punctuation & Syntax', 'Comprehension & Vocabulary'],
    'SHS 2': ['Figures of Speech & Rhetoric', 'Clause Analysis', 'Summary & Lexis'],
    'SHS 3': ['Idiomatic Expressions & Phrasal Verbs', 'Poetry & Literary Appreciation', 'Advanced Register']
  },
  'General Knowledge': {
    'SHS 1': ['Scientific Method & Inventions', 'African & World Geography', 'Milestones in Science'],
    'SHS 2': ['Pioneering Scientists & Discoveries', 'World Organisations & Global History', 'Environmental Milestones'],
    'SHS 3': ['Nobel Laureates in Science', 'Modern Space Exploration & Technology', 'Global Geopolitics & Economics']
  }
};

export function getCurriculumTopics(subject: Subject, level?: ShsLevel): string[] {
  const subjectTree = GHANA_SHS_CURRICULUM[subject] || GHANA_SHS_CURRICULUM['Core Mathematics'];
  if (level && subjectTree[level]) {
    return subjectTree[level];
  }
  // Return all topics across all levels for this subject
  return [
    ...(subjectTree['SHS 1'] || []),
    ...(subjectTree['SHS 2'] || []),
    ...(subjectTree['SHS 3'] || [])
  ];
}
