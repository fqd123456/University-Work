export type RegionDistrictOption = {
  label: string
  district: string
  regionId: string
}

export type RegionCityOption = {
  label: string
  regionId: string
  districts: RegionDistrictOption[]
}

export type RegionProvinceOption = {
  label: string
  cities: RegionCityOption[]
}

export type RegionSelection = {
  regionId: string
  regionName: string
  province: string
  city: string
  district: string
  displayLabel: string
  indices: number[]
}

export const DEFAULT_MARTYR_REGION_ID = 'jx_fuzhou'

export const MARTYR_REGION_TREE: RegionProvinceOption[] = [
  {
    label: '江西省',
    cities: [
      {
        label: '抚州市',
        regionId: 'jx_fuzhou',
        districts: [
          { label: '全市', district: '', regionId: 'jx_fuzhou' },
          { label: '临川区', district: '临川区', regionId: 'jx_fuzhou' },
          { label: '东乡区', district: '东乡区', regionId: 'jx_fuzhou' },
          { label: '南城县', district: '南城县', regionId: 'jx_fuzhou' },
        ],
      },
      {
        label: '南昌市',
        regionId: 'jx_nanchang',
        districts: [
          { label: '全市', district: '', regionId: 'jx_nanchang' },
          { label: '红谷滩区', district: '红谷滩区', regionId: 'jx_nanchang' },
          { label: '青山湖区', district: '青山湖区', regionId: 'jx_nanchang' },
        ],
      },
    ],
  },
  {
    label: '福建省',
    cities: [
      {
        label: '福州市',
        regionId: 'fj_fuzhou',
        districts: [
          { label: '全市', district: '', regionId: 'fj_fuzhou' },
          { label: '鼓楼区', district: '鼓楼区', regionId: 'fj_fuzhou' },
          { label: '仓山区', district: '仓山区', regionId: 'fj_fuzhou' },
        ],
      },
    ],
  },
]

export const getRegionPickerColumns = (indices: number[] = [0, 0, 0]) => {
  const provinceIndex = Math.min(indices[0] || 0, MARTYR_REGION_TREE.length - 1)
  const provinceList = MARTYR_REGION_TREE.map((item) => item.label)
  const cityOptions = MARTYR_REGION_TREE[provinceIndex].cities
  const cityIndex = Math.min(indices[1] || 0, cityOptions.length - 1)
  const districtOptions = cityOptions[cityIndex].districts

  return [
    provinceList,
    cityOptions.map((item) => item.label),
    districtOptions.map((item) => item.label),
  ]
}

export const getRegionSelectionFromIndices = (indices: number[] = [0, 0, 0]): RegionSelection => {
  const provinceIndex = Math.min(indices[0] || 0, MARTYR_REGION_TREE.length - 1)
  const provinceOption = MARTYR_REGION_TREE[provinceIndex]
  const cityIndex = Math.min(indices[1] || 0, provinceOption.cities.length - 1)
  const cityOption = provinceOption.cities[cityIndex]
  const districtIndex = Math.min(indices[2] || 0, cityOption.districts.length - 1)
  const districtOption = cityOption.districts[districtIndex]

  return {
    regionId: districtOption.regionId || cityOption.regionId,
    regionName: `${provinceOption.label}${cityOption.label}`,
    province: provinceOption.label,
    city: cityOption.label,
    district: districtOption.district,
    displayLabel: districtOption.district
      ? `${provinceOption.label} ${cityOption.label} ${districtOption.district}`
      : `${provinceOption.label} ${cityOption.label}`,
    indices: [provinceIndex, cityIndex, districtIndex],
  }
}

export const findRegionSelectionByCity = (cityName: string): RegionSelection | null => {
  const nextCityName = `${cityName || ''}`.trim()

  for (let provinceIndex = 0; provinceIndex < MARTYR_REGION_TREE.length; provinceIndex += 1) {
    const province = MARTYR_REGION_TREE[provinceIndex]

    for (let cityIndex = 0; cityIndex < province.cities.length; cityIndex += 1) {
      const city = province.cities[cityIndex]

      if (city.label === nextCityName) {
        return getRegionSelectionFromIndices([provinceIndex, cityIndex, 0])
      }
    }
  }

  return null
}

export const findRegionSelectionByRegionId = (regionId: string): RegionSelection | null => {
  const nextRegionId = `${regionId || ''}`.trim()

  for (let provinceIndex = 0; provinceIndex < MARTYR_REGION_TREE.length; provinceIndex += 1) {
    const province = MARTYR_REGION_TREE[provinceIndex]

    for (let cityIndex = 0; cityIndex < province.cities.length; cityIndex += 1) {
      const city = province.cities[cityIndex]

      for (let districtIndex = 0; districtIndex < city.districts.length; districtIndex += 1) {
        const district = city.districts[districtIndex]

        if (district.regionId === nextRegionId) {
          return getRegionSelectionFromIndices([provinceIndex, cityIndex, districtIndex])
        }
      }
    }
  }

  return null
}
