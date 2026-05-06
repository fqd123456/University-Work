export type TrainingPolicySupportItem = {
  title: string
  desc: string
}

export type TrainingPolicy = {
  _id?: string
  regionId: string
  regionName: string
  province: string
  city: string
  policyTitle: string
  policySummary: string
  policyHighlights: string[]
  supportItems: TrainingPolicySupportItem[]
  notice: string
  updatedAt?: string
}

export type TrainingProvider = {
  _id?: string
  regionId: string
  regionName: string
  province: string
  city: string
  district?: string
  providerName: string
  providerType: string
  address: string
  latitude?: number
  longitude?: number
  contactName: string
  contactPhone: string
  intro: string
  specialties: string[]
  isActive?: boolean
  updatedAt?: string
}

export type TrainingProgramStatus = '报名中' | '即将开班' | '培训中' | '已结业'
export type TrainingRegistrationStage = '审核中' | '待开班' | '培训中' | '已结业' | '未通过'

export type TrainingProgram = {
  _id?: string
  regionId: string
  regionName: string
  province: string
  city: string
  district?: string
  providerId: string
  providerName: string
  title: string
  summary: string
  enrolledCount: number
  capacity: number
  address: string
  category: string
  positions: string[]
  programStatus: TrainingProgramStatus
  trainingStartAt: string
  trainingEndAt: string
  registrationStartAt: string
  registrationEndAt: string
  approvalAgency: string
  contactName: string
  contactPhone: string
  certificateAvailable: boolean
  certificateName: string
  certificateLevel: string
  trainingGoal: string
  trainingContent: string
  assessmentStandard: string
  isRecommended?: boolean
  isActive?: boolean
  updatedAt?: string
}

export type TrainingRegistration = {
  _id?: string
  userId: string
  programId: string
  providerId: string
  regionId: string
  title: string
  providerName: string
  category: string
  address: string
  stage: TrainingRegistrationStage
  registeredAt: string
  updatedAt: string
  trainingStartAt: string
  trainingEndAt: string
  certificateAvailable: boolean
  certificateName: string
  certificateLevel: string
  auditNote: string
  completionNote?: string
  autoApproveAt?: string
}

export type TrainingStatusSummary = {
  hasRegistration: boolean
  currentStage: TrainingRegistrationStage | ''
  latestProgramTitle: string
  activeCount: number
  completedCount: number
}

export type EducationTrainingHomeData = {
  regionId: string
  regionName: string
  province: string
  city: string
  policy: TrainingPolicy | null
  recommendedPrograms: TrainingProgram[]
  statusSummary: TrainingStatusSummary
}
