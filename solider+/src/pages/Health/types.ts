export type HealthProfile = {
  _id?: string
  userId: string
  displayName: string
  roleLabel: string
  birthDate?: string
  avatarUrl?: string
  heightCm: number
  latestWeightKg: number
  goalWeightKg: number
  bmi: number
  updatedAt?: string
}

export type HealthLog = {
  _id?: string
  userId: string
  weightKg: number
  recordedAt: string
  recordedMonthLabel: string
  heightCmSnapshot: number
  bmi: number
}

export type HealthDashboard = {
  profile: HealthProfile
  logs: HealthLog[]
}
