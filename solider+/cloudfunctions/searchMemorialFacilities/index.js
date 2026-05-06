const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const _ = db.command

const DEFAULT_REGION_ID = 'jx_fuzhou'

const normalizeString = (value) => `${value || ''}`.trim()

const normalizePositiveInt = (value, defaultValue, maxValue) => {
  const parsed = parseInt(value, 10)

  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue
  }

  return Math.min(parsed, maxValue)
}

const escapeRegExp = (value) => {
  return `${value || ''}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const buildCondition = (payload) => {
  const conditions = []

  if (payload.regionId) {
    conditions.push({ regionId: payload.regionId })
  }

  if (payload.province) {
    conditions.push({ province: payload.province })
  }

  if (payload.city) {
    conditions.push({ city: payload.city })
  }

  if (payload.district) {
    conditions.push({ district: payload.district })
  }

  if (payload.keyword) {
    const keywordRegExp = db.RegExp({
      regexp: escapeRegExp(payload.keyword),
      options: 'i',
    })

    conditions.push(_.or([
      { facilityName: keywordRegExp },
      { facilityType: keywordRegExp },
      { address: keywordRegExp },
      { locationLabel: keywordRegExp },
      { city: keywordRegExp },
      { district: keywordRegExp },
    ]))
  }

  if (!conditions.length) {
    return { regionId: DEFAULT_REGION_ID }
  }

  return conditions.length === 1 ? conditions[0] : _.and(conditions)
}

exports.main = async (event = {}) => {
  const payload = {
    page: normalizePositiveInt(event.page, 1, 1000),
    pageSize: normalizePositiveInt(event.pageSize, 20, 50),
    keyword: normalizeString(event.keyword),
    regionId: normalizeString(event.regionId),
    province: normalizeString(event.province),
    city: normalizeString(event.city),
    district: normalizeString(event.district),
  }
  const condition = buildCondition(payload)
  const skip = (payload.page - 1) * payload.pageSize

  try {
    const [countRes, listRes] = await Promise.all([
      db.collection('regional_memorial_facilities').where(condition).count(),
      db.collection('regional_memorial_facilities')
        .where(condition)
        .orderBy('updatedAt', 'desc')
        .skip(skip)
        .limit(payload.pageSize)
        .get(),
    ])

    const total = countRes.total || 0

    return {
      success: true,
      data: {
        list: listRes.data || [],
        pagination: {
          page: payload.page,
          pageSize: payload.pageSize,
          total,
          hasMore: skip + (listRes.data || []).length < total,
        },
        filters: payload,
      }
    }
  } catch (error) {
    console.error('查询烈士纪念设施失败', error)
    return {
      success: false,
      message: '查询烈士纪念设施失败',
      error,
    }
  }
}
