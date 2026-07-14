export const ROLES = [
  { id: 'bedrijfsarts', label: 'Bedrijfsarts' },
  { id: 'arboverpleegkundige', label: 'Arboverpleegkundige' },
  { id: 'pob', label: 'Praktijkondersteuner bedrijfsarts (POB)' },
]

export const CONSULT_TYPES = [
  { id: 'Verzuimspreekuur', label: 'Verzuimspreekuur' },
  { id: 'Vervolgconsult', label: 'Vervolgconsult' },
  { id: 'Preventief consult', label: 'Preventief consult' },
  { id: 'Arbeidsomstandighedenspreekuur', label: 'Arbeidsomstandighedenspreekuur' },
]

export const BEPERKING_CATEGORIEEN = [
  'Energie en duurbelasting',
  'Concentratie en aandacht',
  'Fysieke belasting',
  'Emotionele belasting',
  'Werken onder tijdsdruk',
  'Samenwerken en sociale interactie',
]

export const WERKFACTOR_CATEGORIEEN = [
  'Werkdruk en tempo',
  'Werkinhoud en taken',
  'Samenwerking en werksfeer',
  'Spanning met leidinggevende of collega',
  'Fysieke arbeidsomstandigheden',
  'Werktijden en roosters',
]

// Maximaal aantal vragen in de flow, inclusief vervolgvragen.
export const MAX_QUESTIONS = 13

// Vragenset voor verzuimspreekuur en vervolgconsult.
export const VERZUIM_QUESTIONS = [
  {
    id: 'aanleiding',
    label: 'Wat was de aanleiding van dit spreekuur?',
    hint: 'Kort, in eigen woorden. Kies een suggestie of typ zelf.',
    type: 'text',
    suggestions: [
      'Verzuimbegeleiding na ziekmelding',
      'Vervolg op eerder spreekuur',
      'Preventieve vraag van de werknemer',
      'Vraag over arbeidsomstandigheden',
    ],
    required: true,
    adaptiveCheck: false,
  },
  {
    id: 'welKan',
    label: 'Wat kan de werknemer op dit moment wél?',
    hint: 'Denk aan taken, uren per dag of week, eigen werk of aangepast werk. Bijvoorbeeld: "2x4 uur per week aangepast werk, administratieve taken".',
    type: 'textarea',
    required: true,
    adaptiveCheck: true,
  },
  {
    id: 'beperkingen',
    label: 'Welke beperkingen zijn er, in functionele termen?',
    hint: 'Klik categorieën aan en licht toe in het tekstveld.',
    type: 'chips-text',
    chips: BEPERKING_CATEGORIEEN,
    required: true,
    adaptiveCheck: true,
  },
  {
    id: 'werkgerelateerd',
    label: 'Is het verzuim (mede) werkgerelateerd?',
    hint: 'Relevant voor de leidinggevende: bij werkgerelateerde factoren liggen oplossingen (deels) in het werk zelf. Benoem alleen functionele factoren, geen medische oorzaken.',
    type: 'choice',
    options: ['Ja', 'Gedeeltelijk', 'Nee', 'Nog onduidelijk'],
    required: true,
    adaptiveCheck: false,
    conditionalFollowUp: {
      triggerValues: ['Ja', 'Gedeeltelijk'],
      question: {
        id: 'werkfactoren',
        parentId: 'werkgerelateerd',
        label: 'Welke werkgerelateerde factoren spelen een rol?',
        hint: 'Klik factoren aan en licht kort toe. Houd het functioneel en werkgericht, bijvoorbeeld: "de combinatie van hoge werkdruk en onduidelijke taakverdeling".',
        type: 'chips-text',
        chips: WERKFACTOR_CATEGORIEEN,
        required: false,
        adaptiveCheck: false,
        isFollowUp: true,
      },
    },
  },
  {
    id: 'verwachting',
    label: 'Wat is de verwachting voor de komende periode?',
    hint: 'Kies het beeld en vul de termijn in weken in.',
    type: 'expectation',
    options: ['Opbouw', 'Stabiel', 'Nog onduidelijk'],
    required: true,
    adaptiveCheck: false,
  },
  {
    id: 'advies',
    label: 'Welk concreet advies geef je de leidinggevende?',
    hint: 'Bijvoorbeeld: opbouwschema afspreken, werk aanpassen, wekelijks gesprek voeren, taken tijdelijk herverdelen.',
    type: 'textarea',
    suggestions: [
      'Opbouwschema afspreken',
      'Werkaanpassing regelen',
      'Regelmatig gesprek voeren',
      'Taken tijdelijk herverdelen',
    ],
    required: true,
    adaptiveCheck: true,
  },
  {
    id: 'afspraken',
    label: 'Welke afspraken zijn met de werknemer gemaakt?',
    hint: 'Bijvoorbeeld over uren, taken of contact met de leidinggevende.',
    type: 'textarea',
    required: false,
    adaptiveCheck: false,
  },
  {
    id: 'vervolg',
    label: 'Wanneer is het vervolgcontact en met wie?',
    hint: 'Bijvoorbeeld: "Over drie weken vervolgconsult bij de bedrijfsarts".',
    type: 'text',
    required: false,
    adaptiveCheck: false,
  },
  {
    id: 'interventie',
    label: 'Loopt er een interventie of vervolgstap die relevant is voor de werkgever?',
    hint: 'Alleen in functionele termen, bijvoorbeeld: "er is een traject gestart gericht op herstel van belastbaarheid". Laat leeg als niet van toepassing.',
    type: 'textarea',
    required: false,
    adaptiveCheck: false,
  },
  {
    id: 'toestemming',
    label: 'Heeft de werknemer toestemming gegeven om eventuele aanvullende informatie te delen?',
    hint: 'Standaard nee: dan blijft alles strikt functioneel.',
    type: 'consent',
    required: true,
    adaptiveCheck: false,
  },
  {
    id: 'aandachtspunten',
    label: 'Zijn er nog aandachtspunten voor deze terugkoppelingsbrief?',
    hint: 'Alles wat de tool moet weten of meenemen: iets dat zeker benoemd moet worden, iets dat juist niet in de brief hoort, een gevoeligheid in de relatie met de leidinggevende, of een gewenst accent. Laat leeg als niet van toepassing.',
    type: 'textarea',
    required: false,
    adaptiveCheck: false,
  },
]

// Vragenset voor preventief consult en arbeidsomstandighedenspreekuur:
// de werknemer is niet (per se) ziek, dus geen verzuim- of belastbaarheidsvragen.
// Instemming van de werknemer is bij deze spreekuren voorwaarde voor terugkoppeling.
export const PREVENTIEF_QUESTIONS = [
  {
    id: 'instemming',
    label: 'Heeft de werknemer ingestemd met een terugkoppeling aan de leidinggevende?',
    hint: 'Bij een preventief spreekuur of arbeidsomstandighedenspreekuur is instemming van de werknemer voorwaarde. Zonder instemming wordt er geen terugkoppeling opgesteld.',
    type: 'choice',
    options: ['Ja', 'Nee'],
    required: true,
    adaptiveCheck: false,
  },
  {
    id: 'aanleiding',
    label: 'Wat was de aanleiding van dit spreekuur?',
    hint: 'Kort, in eigen woorden. Kies een suggestie of typ zelf. Houd het functioneel en werkgericht.',
    type: 'text',
    suggestions: [
      'Eigen vraag van de werknemer over gezondheid en werk',
      'Vraag over de werkomstandigheden',
      'Signalen van werkdruk',
      'Advies over duurzame inzetbaarheid',
    ],
    required: true,
    adaptiveCheck: false,
  },
  {
    id: 'situatie',
    label: 'Wat speelt er, in functionele en werkgerichte termen?',
    hint: 'Beschrijf de situatie zonder medische termen of privé-informatie. Bijvoorbeeld: "de combinatie van piekbelasting en onduidelijke taakverdeling vraagt aandacht".',
    type: 'textarea',
    required: true,
    adaptiveCheck: true,
  },
  {
    id: 'werkfactoren',
    label: 'Welke werkfactoren zijn relevant?',
    hint: 'Klik factoren aan en licht kort toe.',
    type: 'chips-text',
    chips: WERKFACTOR_CATEGORIEEN,
    required: false,
    adaptiveCheck: false,
  },
  {
    id: 'advies',
    label: 'Welk concreet advies geef je de leidinggevende?',
    hint: 'Preventief en actiegericht: wat kan de leidinggevende doen?',
    type: 'textarea',
    suggestions: [
      'Werkplek of taken aanpassen',
      'Gesprek voeren over werkdruk',
      'Rooster of werktijden bespreken',
      'Preventieve maatregelen arbeidsomstandigheden',
    ],
    required: true,
    adaptiveCheck: true,
  },
  {
    id: 'afspraken',
    label: 'Welke afspraken zijn met de werknemer gemaakt?',
    hint: 'Bijvoorbeeld over vervolgstappen of het gesprek met de leidinggevende.',
    type: 'textarea',
    required: false,
    adaptiveCheck: false,
  },
  {
    id: 'vervolg',
    label: 'Is er een vervolgcontact afgesproken, en met wie?',
    hint: 'Laat leeg als niet van toepassing.',
    type: 'text',
    required: false,
    adaptiveCheck: false,
  },
  {
    id: 'aandachtspunten',
    label: 'Zijn er nog aandachtspunten voor deze terugkoppelingsbrief?',
    hint: 'Alles wat de tool moet weten of meenemen. Laat leeg als niet van toepassing.',
    type: 'textarea',
    required: false,
    adaptiveCheck: false,
  },
]

// Kies de vragenset op basis van het type spreekuur.
export function questionsForConsultType(consultType) {
  return consultType === 'Preventief consult' ||
    consultType === 'Arbeidsomstandighedenspreekuur'
    ? PREVENTIEF_QUESTIONS
    : VERZUIM_QUESTIONS
}

// Compatibiliteit: bestaande imports gebruiken QUESTIONS als standaardset.
export const QUESTIONS = VERZUIM_QUESTIONS
