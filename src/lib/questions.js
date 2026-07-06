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

// Maximaal aantal vragen in de flow, inclusief adaptieve vervolgvragen.
export const MAX_QUESTIONS = 10

export const QUESTIONS = [
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
]
