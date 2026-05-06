export type EntrepreneurshipCompany = {
  _id?: string
  regionId: string
  regionName: string
  companyName: string
  founderName: string
  founderTitle: string
  contactName: string
  contactPhone: string
  address: string
  latitude?: number
  longitude?: number
  industry: string
  establishedAt: string
  initialInvestment: string
  currentStage: string
  teamSize: string
  annualRevenue: string
  intro: string
  mentorshipDirection: string
  futurePlan: string
  tags: string[]
  supportHighlights: string[]
  isFeatured?: boolean
  isActive?: boolean
  updatedAt?: string
}

export type RegionalEntrepreneurshipOffice = {
  _id?: string
  regionId: string
  regionName: string
  province: string
  city: string
  district?: string
  officeName: string
  contactName: string
  contactPhone: string
  officeHours: string
  address: string
  latitude?: number
  longitude?: number
  serviceScope: string[]
  materials: string[]
  policyTips: string[]
  updatedAt?: string
}

export type EntrepreneurshipHomeData = {
  regionId: string
  regionName: string
  mentorCompanies: EntrepreneurshipCompany[]
  office: RegionalEntrepreneurshipOffice | null
  overview: {
    mentorCompanyCount: number
    featuredCompanyCount: number
    hasOffice: boolean
  }
}
