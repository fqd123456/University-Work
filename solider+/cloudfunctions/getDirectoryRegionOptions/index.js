const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const DEFAULT_REGION_TREE = [
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

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

const buildTreeFromCollection = (list) => {
  const provinceMap = new Map()

  list.forEach((item) => {
    if (!item || !item.province || !item.city) {
      return
    }

    if (!provinceMap.has(item.province)) {
      provinceMap.set(item.province, [])
    }

    provinceMap.get(item.province).push({
      label: item.city,
      regionId: item.regionId || item._id,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 999,
      districts: normalizeArray(item.districts),
    })
  })

  return Array.from(provinceMap.entries())
    .sort((left, right) => `${left[0]}`.localeCompare(`${right[0]}`))
    .map(([provinceLabel, cities]) => ({
      label: provinceLabel,
      cities: cities
        .sort((left, right) => left.sortOrder - right.sortOrder || `${left.label}`.localeCompare(`${right.label}`))
        .map((cityItem) => ({
          label: cityItem.label,
          regionId: cityItem.regionId,
          districts: cityItem.districts.length
            ? cityItem.districts
            : [{ label: '全市', district: '', regionId: cityItem.regionId }],
        })),
    }))
}

exports.main = async () => {
  try {
    const res = await db.collection('regional_directory_regions').limit(100).get()
    const list = normalizeArray(res.data)
    const tree = list.length ? buildTreeFromCollection(list) : DEFAULT_REGION_TREE

    return {
      success: true,
      data: {
        defaultRegionId: 'jx_fuzhou',
        tree,
      }
    }
  } catch (error) {
    console.error('获取地区联级配置失败', error)
    return {
      success: true,
      data: {
        defaultRegionId: 'jx_fuzhou',
        tree: DEFAULT_REGION_TREE,
      }
    }
  }
}
