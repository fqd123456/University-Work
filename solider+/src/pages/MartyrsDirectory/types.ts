export type MartyrRecord = {
  _id?: string
  regionId: string
  regionName: string
  province: string
  city: string
  district: string
  name: string
  gender?: string
  birthDate: string
  sacrificeDate: string
  lifespan: string
  nativePlace: string
  address: string
  serviceUnit: string
  position: string
  sacrificePlace: string
  memorialSite: string
  lifeStory: string
  sacrificeSituation: string
  heroicStory: string
  tags: string[]
  searchKeywords?: string[]
  updatedAt?: string
}

export type MartyrDirectoryHomeData = {
  regionId: string
  regionName: string
  martyrList: MartyrRecord[]
  summary: {
    total: number
  }
}
