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

export const DEFAULT_DIRECTORY_REGION_ID = 'jx_fuzhou'
const UNLIMITED_LABEL = '不限地区'
const UNLIMITED_SUB_LABEL = '不限'

export const DEFAULT_DIRECTORY_REGION_TREE: RegionProvinceOption[] = [
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

export const getRegionPickerColumns = (tree: RegionProvinceOption[], indices: number[] = [0, 0, 0]) => {
  const safeTree = tree.length ? tree : DEFAULT_DIRECTORY_REGION_TREE
  const rawProvinceIndex = Math.max(indices[0] || 0, 0)
  const provinceList = [UNLIMITED_LABEL, ...safeTree.map((item) => item.label)]

  if (rawProvinceIndex === 0) {
    return [
      provinceList,
      [UNLIMITED_SUB_LABEL],
      [UNLIMITED_SUB_LABEL],
    ]
  }

  const provinceIndex = Math.min(rawProvinceIndex - 1, safeTree.length - 1)
  const cityOptions = safeTree[provinceIndex].cities
  const cityIndex = Math.min(indices[1] || 0, cityOptions.length - 1)
  const districtOptions = cityOptions[cityIndex].districts

  return [
    provinceList,
    cityOptions.map((item) => item.label),
    districtOptions.map((item) => item.label),
  ]
}

export const getRegionSelectionFromIndices = (tree: RegionProvinceOption[], indices: number[] = [0, 0, 0]): RegionSelection => {
  const safeTree = tree.length ? tree : DEFAULT_DIRECTORY_REGION_TREE
  const rawProvinceIndex = Math.max(indices[0] || 0, 0)

  if (rawProvinceIndex === 0) {
    return getUnlimitedRegionSelection()
  }

  const provinceIndex = Math.min(rawProvinceIndex - 1, safeTree.length - 1)
  const provinceOption = safeTree[provinceIndex]
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
    indices: [rawProvinceIndex, cityIndex, districtIndex],
  }
}

export const findRegionSelectionByCity = (tree: RegionProvinceOption[], cityName: string): RegionSelection | null => {
  const nextCityName = `${cityName || ''}`.trim()
  const safeTree = tree.length ? tree : DEFAULT_DIRECTORY_REGION_TREE

  for (let provinceIndex = 0; provinceIndex < safeTree.length; provinceIndex += 1) {
    const province = safeTree[provinceIndex]

    for (let cityIndex = 0; cityIndex < province.cities.length; cityIndex += 1) {
      const city = province.cities[cityIndex]

      if (city.label === nextCityName) {
        return getRegionSelectionFromIndices(safeTree, [provinceIndex + 1, cityIndex, 0])
      }
    }
  }

  return null
}

export const findRegionSelectionByRegionId = (tree: RegionProvinceOption[], regionId: string): RegionSelection | null => {
  const nextRegionId = `${regionId || ''}`.trim()
  const safeTree = tree.length ? tree : DEFAULT_DIRECTORY_REGION_TREE

  for (let provinceIndex = 0; provinceIndex < safeTree.length; provinceIndex += 1) {
    const province = safeTree[provinceIndex]

    for (let cityIndex = 0; cityIndex < province.cities.length; cityIndex += 1) {
      const city = province.cities[cityIndex]

      for (let districtIndex = 0; districtIndex < city.districts.length; districtIndex += 1) {
        const district = city.districts[districtIndex]

        if (district.regionId === nextRegionId) {
          return getRegionSelectionFromIndices(safeTree, [provinceIndex + 1, cityIndex, districtIndex])
        }
      }
    }
  }

  return null
}

export const getUnlimitedRegionSelection = (): RegionSelection => ({
  regionId: '',
  regionName: '不限地区',
  province: '',
  city: '',
  district: '',
  displayLabel: '不限地区',
  indices: [0, 0, 0],
})
