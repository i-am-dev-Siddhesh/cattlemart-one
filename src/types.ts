export type AreaUnit = 'acre' | 'hectare' | 'cent' | 'guntha' | 'sqft' | 'sqm'
export type QtyUnit = 'kg' | 'quintal' | 'ton' | 'litre' | 'bag' | 'hour' | 'day' | 'number'
export type PlotStatus = 'active' | 'fallow' | 'harvested' | 'inactive'
export type CropStatus = 'planned' | 'growing' | 'harvested' | 'failed'
export type ExpenseCategory =
  | 'land_preparation'
  | 'labour'
  | 'seeds'
  | 'fertilizers'
  | 'pesticides'
  | 'herbicides'
  | 'fungicides'
  | 'irrigation'
  | 'machinery'
  | 'fuel'
  | 'electricity'
  | 'transportation'
  | 'harvesting'
  | 'storage'
  | 'lease'
  | 'other'
export type IncomeCategory = 'crop_sale' | 'byproduct' | 'other'

export type LngLat = [number, number]
export type Ring = LngLat[]
export type Polygon = Ring[]

export type User = {
  id: string
  name: string
  phone: string
  email: string
  village: string
  createdAt: string
  updatedAt: string
}

export type Farm = {
  id: string
  userId: string
  name: string
  location: string
  center: { lat: number; lng: number }
  totalArea: number
  areaUnit: AreaUnit
  boundary: Polygon | null
  layoutImage: string | null
  layoutBounds: [[number, number], [number, number]] | null
  village?: string
  district?: string
  state?: string
  country?: string
  ownedArea?: number | null
  leasedArea?: number | null
  soilTypes?: string
  waterSources?: string
  irrigationSystems?: string
  createdAt: string
  updatedAt: string
}

export type Plot = {
  id: string
  farmId: string
  name: string
  plotNumber: string
  boundary: Polygon | null
  area: number
  areaUnit: AreaUnit
  color: string
  status: PlotStatus
  notes: string
  ownership?: 'owned' | 'leased' | 'unknown'
  soilType?: string
  irrigationType?: string
  waterSource?: string
  drainage?: string
  createdAt: string
  updatedAt: string
}

export type CropCycle = {
  id: string
  plotId: string
  cropName: string
  variety: string
  season: string
  plantingDate: string
  expectedHarvestDate: string
  actualHarvestDate: string
  seedQuantity: number | null
  seedCost: number | null
  expectedYield: number | null
  actualYield: number | null
  yieldUnit: QtyUnit
  status: CropStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export type ActivityType = {
  id: string
  name: string
  description: string
  isCustom: boolean
}

export type Attachment = {
  id: string
  name: string
  dataUrl: string
}

export type Activity = {
  id: string
  plotId: string
  cropCycleId: string | null
  activityTypeId: string
  date: string
  quantity: number | null
  unit: QtyUnit | ''
  labourCost: number
  machineryCost: number
  materialCost: number
  otherCost: number
  totalCost: number
  person: string
  notes: string
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

export type Expense = {
  id: string
  plotId: string
  cropCycleId: string | null
  activityId: string | null
  category: ExpenseCategory
  amount: number
  date: string
  vendor: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type Income = {
  id: string
  plotId: string
  cropCycleId: string | null
  category: IncomeCategory
  amount: number
  quantity: number | null
  unit: QtyUnit | ''
  date: string
  buyer: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type Settings = {
  locale: 'en'
  defaultAreaUnit: AreaUnit
  defaultYieldUnit: QtyUnit
  currency: 'INR'
  role: 'owner' | 'manager' | 'agronomist' | 'worker' | 'accountant' | 'viewer'
}

export type InventoryItem = {
  id: string
  farmId: string
  name: string
  category: string
  brand: string
  unit: QtyUnit
  quantity: number
  minStock: number
  purchasePrice: number | null
  expiryDate: string
  storage: string
  supplier: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type InventoryMove = {
  id: string
  itemId: string
  plotId: string | null
  cropCycleId: string | null
  date: string
  used: number
  previous: number
  remaining: number
  notes: string
  createdAt: string
}

export type PestObservation = {
  id: string
  plotId: string
  cropCycleId: string | null
  name: string
  date: string
  severity: string
  affectedPct: number | null
  symptoms: string
  action: string
  confidence: 'possible' | 'likely' | 'confirmed'
  notes: string
  createdAt: string
  updatedAt: string
}

export type DiseaseObservation = {
  id: string
  plotId: string
  cropCycleId: string | null
  name: string
  date: string
  severity: string
  symptoms: string
  treatment: string
  confidence: 'possible' | 'likely' | 'confirmed'
  notes: string
  createdAt: string
  updatedAt: string
}

export type FieldObservation = {
  id: string
  plotId: string
  cropCycleId: string | null
  date: string
  growthStage: string
  notes: string
  weather: string
  createdAt: string
  updatedAt: string
}

export type SoilTest = {
  id: string
  plotId: string
  date: string
  lab: string
  ph: number | null
  nitrogen: string
  phosphorus: string
  potassium: string
  organicCarbon: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type IrrigationLog = {
  id: string
  plotId: string
  cropCycleId: string | null
  date: string
  method: string
  hours: number | null
  quantity: number | null
  unit: string
  cost: number
  source: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type Worker = {
  id: string
  farmId: string
  name: string
  role: string
  dailyWage: number | null
  contact: string
  createdAt: string
  updatedAt: string
}

export type LabourLog = {
  id: string
  workerId: string | null
  plotId: string
  cropCycleId: string | null
  date: string
  hours: number
  cost: number
  activity: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type Equipment = {
  id: string
  farmId: string
  name: string
  type: string
  fuelType: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type Harvest = {
  id: string
  plotId: string
  cropCycleId: string | null
  date: string
  batch: string
  quantity: number
  unit: QtyUnit
  grade: string
  marketable: number | null
  notes: string
  createdAt: string
  updatedAt: string
}

export type FarmTask = {
  id: string
  farmId: string
  plotId: string | null
  title: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  status: 'planned' | 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignee: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type DiaryEntry = {
  id: string
  farmId: string
  plotId: string | null
  date: string
  text: string
  structured: string
  createdAt: string
  updatedAt: string
}

export type AppState = {
  user: User
  farms: Farm[]
  plots: Plot[]
  cropCycles: CropCycle[]
  activityTypes: ActivityType[]
  activities: Activity[]
  expenses: Expense[]
  incomes: Income[]
  inventory: InventoryItem[]
  inventoryMoves: InventoryMove[]
  pests: PestObservation[]
  diseases: DiseaseObservation[]
  observations: FieldObservation[]
  soilTests: SoilTest[]
  irrigations: IrrigationLog[]
  workers: Worker[]
  labourLogs: LabourLog[]
  equipment: Equipment[]
  harvests: Harvest[]
  tasks: FarmTask[]
  diary: DiaryEntry[]
  activeFarmId: string | null
  settings: Settings
}
