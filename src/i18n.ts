export const messages = {
  en: {
      appName: 'Cattlemart One',
    appTag: 'Digital twin of the farm',
    nav: {
      dashboard: 'Dashboard',
      map: 'Farm Map',
      plots: 'Plots',
      assistant: 'Cattlemart One AI',
      ops: 'Operations',
      activities: 'Activities',
      crops: 'Crops',
      finance: 'Finance',
      calendar: 'Calendar',
      reports: 'Reports',
      compare: 'Compare',
      settings: 'Settings',
    },
    areaUnits: {
      acre: 'Acre',
      hectare: 'Hectare',
      cent: 'Cent',
      guntha: 'Guntha',
      sqft: 'Square feet',
      sqm: 'Square metre',
    },
    qtyUnits: {
      kg: 'Kg',
      quintal: 'Quintal',
      ton: 'Ton',
      litre: 'Litres',
      bag: 'Bags',
      hour: 'Hours',
      day: 'Days',
      number: 'Number',
    },
    plotStatus: {
      active: 'Active',
      fallow: 'Fallow',
      harvested: 'Harvested',
      inactive: 'Inactive',
    },
    cropStatus: {
      planned: 'Planned',
      growing: 'Growing',
      harvested: 'Harvested',
      failed: 'Failed',
    },
    expense: {
      land_preparation: 'Land preparation',
      labour: 'Labour',
      seeds: 'Seeds',
      fertilizers: 'Fertilizers',
      pesticides: 'Pesticides',
      herbicides: 'Herbicides',
      fungicides: 'Fungicides',
      irrigation: 'Irrigation',
      machinery: 'Machinery',
      fuel: 'Fuel',
      electricity: 'Electricity',
      transportation: 'Transportation',
      harvesting: 'Harvesting',
      storage: 'Storage',
      lease: 'Land lease',
      other: 'Other',
    },
    income: {
      crop_sale: 'Crop sales',
      byproduct: 'By-product sales',
      other: 'Other income',
    },
  },
} as const

export type Locale = keyof typeof messages

export function t(path: string, locale: Locale = 'en'): string {
  const parts = path.split('.')
  let cur: unknown = messages[locale]
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null || !(p in cur)) return path
    cur = (cur as Record<string, unknown>)[p]
  }
  return typeof cur === 'string' ? cur : path
}
