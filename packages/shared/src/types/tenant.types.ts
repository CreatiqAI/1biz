export interface Tenant {
  id: string
  name: string
  slug: string
  schema: string
  plan: SubscriptionPlan
  isActive: boolean
  createdAt: string
}

export interface TenantSettings {
  companyName: string
  companyRegistrationNo?: string // SSM number
  taxRegistrationNo?: string // SST registration number
  address: Address
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
  currency: string // default: MYR
  timezone: string // default: Asia/Kuala_Lumpur
  dateFormat: string // default: DD/MM/YYYY
  fiscalYearStart: number // month 1-12, default: 1 (January)
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: MalaysianState
  postcode: string
  country: string // default: MY
}

export type SubscriptionPlan = 'starter' | 'growth' | 'business' | 'enterprise'

export type MalaysianState =
  | 'Johor'
  | 'Kedah'
  | 'Kelantan'
  | 'Melaka'
  | 'Negeri Sembilan'
  | 'Pahang'
  | 'Perak'
  | 'Perlis'
  | 'Pulau Pinang'
  | 'Sabah'
  | 'Sarawak'
  | 'Selangor'
  | 'Terengganu'
  | 'Kuala Lumpur'
  | 'Labuan'
  | 'Putrajaya'
