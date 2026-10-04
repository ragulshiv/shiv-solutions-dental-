/**
 * Starting points for common dental prescriptions. The doctor reviews and
 * edits every line before saving; nothing is prescribed automatically.
 */
export interface RxTemplateLine {
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  route?: string
  timing?: string
  instructions?: string
}

export interface RxTemplate {
  name: string
  lines: RxTemplateLine[]
}

export const RX_TEMPLATES: RxTemplate[] = [
  {
    name: 'Pain relief',
    lines: [
      {
        medicationName: 'Ibuprofen 400 mg',
        dosage: '1 tablet',
        frequency: '1-0-1',
        duration: '3 days',
        timing: 'After food',
      },
      {
        medicationName: 'Paracetamol 650 mg',
        dosage: '1 tablet',
        frequency: 'SOS (if pain)',
        duration: '3 days',
        timing: 'After food',
      },
    ],
  },
  {
    name: 'After extraction',
    lines: [
      {
        medicationName: 'Amoxicillin 500 mg',
        dosage: '1 capsule',
        frequency: '1-1-1',
        duration: '5 days',
        timing: 'After food',
      },
      {
        medicationName: 'Ibuprofen 400 mg + Paracetamol 325 mg',
        dosage: '1 tablet',
        frequency: '1-0-1',
        duration: '3 days',
        timing: 'After food',
      },
      {
        medicationName: 'Chlorhexidine 0.2% mouthwash',
        dosage: '10 ml',
        frequency: '1-0-1',
        duration: '7 days',
        route: 'Topical',
        instructions: 'Start 24 hours after extraction. Rinse for 30 seconds, do not swallow.',
      },
    ],
  },
  {
    name: 'Abscess / RCT',
    lines: [
      {
        medicationName: 'Amoxicillin + Clavulanic acid 625 mg',
        dosage: '1 tablet',
        frequency: '1-0-1',
        duration: '5 days',
        timing: 'After food',
      },
      {
        medicationName: 'Metronidazole 400 mg',
        dosage: '1 tablet',
        frequency: '1-1-1',
        duration: '5 days',
        timing: 'After food',
        instructions: 'Avoid alcohol',
      },
      {
        medicationName: 'Ibuprofen 400 mg',
        dosage: '1 tablet',
        frequency: '1-0-1',
        duration: '3 days',
        timing: 'After food',
      },
    ],
  },
  {
    name: 'Gum care',
    lines: [
      {
        medicationName: 'Chlorhexidine 0.2% mouthwash',
        dosage: '10 ml',
        frequency: '1-0-1',
        duration: '14 days',
        route: 'Topical',
        instructions: 'Rinse for 30 seconds after brushing, do not swallow.',
      },
    ],
  },
  {
    name: 'Sensitivity',
    lines: [
      {
        medicationName: 'Potassium nitrate 5% toothpaste',
        dosage: 'Pea-sized',
        frequency: 'Twice daily',
        duration: '4 weeks',
        route: 'Topical',
        instructions: 'Brush gently; do not rinse with water immediately after.',
      },
    ],
  },
]
