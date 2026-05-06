export type UserMedal = {
  id: string
  category: 'health' | 'blog'
  name: string
  icon: string
  description: string
  condition: string
  achieved: boolean
  achievedAt?: string
  achievedAtLabel?: string
}

export type MedalCategory = {
  key: 'health' | 'blog'
  title: string
  subtitle: string
  medals: UserMedal[]
}

export type UserMedalSummary = {
  totalCount: number
  achievedCount: number
  latestAchievedMedalName: string
  latestAchievedAt: string
  healthAchievedCount: number
  blogAchievedCount: number
  healthLogCount: number
  articleCount: number
}

export type UserMedalsData = {
  categories: MedalCategory[]
  summary: UserMedalSummary
}
