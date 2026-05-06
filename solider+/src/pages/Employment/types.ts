export type EmploymentModule = {
  id: string
  key: 'jobs' | 'events' | 'resume' | 'applications'
  title: string
  subtitle: string
  summary: string
  actionText: string
  accent: 'red' | 'orange' | 'blue' | 'green'
  metrics: Array<{
    label: string
    value: string
  }>
}

export type EmploymentModuleKey = EmploymentModule['key']

export type RecruitmentEvent = {
  _id?: string
  id?: string
  title: string
  organizer: string
  eventType: '线上招聘会' | '线下招聘会' | '直播带岗'
  startAt: string
  endAt: string
  dateRangeText: string
  address: string
  city?: string
  participantCount: number
  livePlatform?: string
  liveRoomName?: string
  liveRoomId?: string
  isFollowed?: boolean
  displayStatus?: '关注' | '已关注' | '已结束'
}

export type ResumeProfile = {
  _id?: string
  id?: string
  fullName: string
  birthDate?: string
  targetPosition: string
  targetCity: string
  expectedSalary?: string
  completeness: number
  lastUpdatedAt: string
  highlights: string[]
  bio?: string
  phone?: string
  idPhoto?: string
  certificates?: string[]
  certificateNames?: string[]
  isTemplate?: boolean
}

export type ApplicationProgress = {
  _id?: string
  id?: string
  jobId: string
  companyId?: string
  jobName: string
  companyName: string
  stage: '已投递' | '待沟通' | '面试安排中' | '已录用'
  updatedAt: string
  note: string
  appliedAt?: string
  isTemplate?: boolean
}

export type JobPosting = {
  _id?: string
  id?: string
  companyId?: string
  jobName: string
  companyName: string
  salaryMin: number
  salaryMax: number
  salaryUnit: '月'
  city: string
  district: string
  employmentType: '全职' | '实习'
  education: string
  experience: string
  tags: string[]
  source: string
  updatedAt: string
  isRecommended: boolean
  isActive?: boolean
  isFollowed?: boolean
  workLocation?: string
  workSchedule?: string
  employmentNature?: '全职' | '兼职' | '实习'
  requirements?: string[]
  responsibilities?: string[]
  benefits?: string[]
  contactName?: string
  contactPhone?: string
  companyAddress?: string
  jobDescription?: string
}

export type EmploymentDashboardData = {
  modules: EmploymentModule[]
  recruitmentEvents: RecruitmentEvent[]
  resumeProfile: ResumeProfile | null
  applicationProgressList: ApplicationProgress[]
  followedJobs: JobPosting[]
  followedEvents: RecruitmentEvent[]
  recommendedJobs: JobPosting[]
}
