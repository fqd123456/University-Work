const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const DEFAULT_REGION_ID = 'jx_fuzhou'

const normalizePositiveInt = (value, defaultValue, maxValue) => {
  const parsed = parseInt(value, 10)

  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue
  }

  return Math.min(parsed, maxValue)
}

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

const programStatusPriority = {
  报名中: 0,
  即将开班: 1,
  培训中: 2,
  已结业: 3,
}

const sortPrograms = (list) => {
  return normalizeArray(list).sort((left, right) => {
    if (!!left.isRecommended !== !!right.isRecommended) {
      return left.isRecommended ? -1 : 1
    }

    const leftPriority = typeof programStatusPriority[left.programStatus] === 'number'
      ? programStatusPriority[left.programStatus]
      : 99
    const rightPriority = typeof programStatusPriority[right.programStatus] === 'number'
      ? programStatusPriority[right.programStatus]
      : 99

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return `${right.updatedAt || ''}`.localeCompare(`${left.updatedAt || ''}`)
  })
}

exports.main = async (event = {}) => {
  const regionId = event && event.regionId ? `${event.regionId}` : DEFAULT_REGION_ID
  const page = normalizePositiveInt(event.page, 1, 1000)
  const pageSize = normalizePositiveInt(event.pageSize, 10, 50)

  try {
    const [countRes, listRes, policyRes] = await Promise.all([
      db.collection('training_programs')
        .where({
          regionId,
          isActive: true,
        })
        .count(),
      db.collection('training_programs')
        .where({
          regionId,
          isActive: true,
        })
        .limit(Math.max(page * pageSize, pageSize))
        .get(),
      db.collection('regional_training_policies').doc(regionId).get().catch(() => ({ data: null })),
    ])

    const sorted = sortPrograms(listRes.data)
    const start = (page - 1) * pageSize
    const list = sorted.slice(start, start + pageSize)
    const policy = policyRes && policyRes.data ? policyRes.data : null

    return {
      success: true,
      data: {
        regionId,
        regionName: policy && policy.regionName
          ? policy.regionName
          : list[0] && list[0].regionName
            ? list[0].regionName
            : '当前地区',
        province: policy && policy.province
          ? policy.province
          : list[0] && list[0].province
            ? list[0].province
            : '江西省',
        city: policy && policy.city
          ? policy.city
          : list[0] && list[0].city
            ? list[0].city
            : '抚州市',
        list,
        pagination: {
          page,
          pageSize,
          total: countRes.total || 0,
          hasMore: start + list.length < (countRes.total || 0),
        },
      }
    }
  } catch (error) {
    console.error('获取培训课程列表失败', error)
    return {
      success: false,
      message: '获取培训课程列表失败',
      error,
    }
  }
}
