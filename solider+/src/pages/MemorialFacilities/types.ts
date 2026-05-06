export type MemorialFacility = {
  _id?: string
  regionId: string
  regionName: string
  province: string
  city: string
  district: string
  facilityName: string
  facilityType: string
  address: string
  locationLabel: string
  latitude?: number
  longitude?: number
  coverImage?: string
  imageList: string[]
  intro: string
  history: string
  openHours: string
  tags: string[]
  isFeatured?: boolean
  updatedAt?: string
}

export type MemorialFacilitiesHomeData = {
  regionId: string
  regionName: string
  facilityList: MemorialFacility[]
  summary: {
    total: number
  }
}
