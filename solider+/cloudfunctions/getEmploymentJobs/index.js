const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const _ = db.command

const normalizeString = (value) => `${value || ''}`.trim()

const normalizePositiveInt = (value, defaultValue, maxValue) => {
  const parsed = parseInt(value, 10)

  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue
  }

  return Math.min(parsed, maxValue)
}

const escapeRegExp = (value) => `${value || ''}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildCondition = (payload) => {
  const conditions = [{ isActive: true }]

  if (payload.recommendedOnly) {
    conditions.push({ isRecommended: true })
  }

  if (payload.city) {
    conditions.push({ city: payload.city })
  }

  if (payload.district) {
    conditions.push({ district: payload.district })
  }

  if (payload.employmentType) {
    conditions.push({ employmentType: payload.employmentType })
  }

  if (payload.education) {
    conditions.push({ education: payload.education })
  }

  if (payload.keyword) {
    const keywordRegExp = db.RegExp({
      regexp: escapeRegExp(payload.keyword),
      options: 'i',
    })

    conditions.push(_.or([
      { jobName: keywordRegExp },
      { companyName: keywordRegExp },
      { city: keywordRegExp },
      { district: keywordRegExp },
    ]))
  }

  return conditions.length === 1 ? conditions[0] : _.and(conditions)
}

const getFavoriteIds = async (userId) => {
  const userRes = await db.collection('employment_favorites').where({ userId, targetType: 'job' }).limit(50).get()
  const list = userRes.data || []
  return new Set(list.map((item) => item.targetId).filter(Boolean))
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const payload = {
    page: normalizePositiveInt(event.page, 1, 1000),
    pageSize: normalizePositiveInt(event.pageSize, 10, 20),
    keyword: normalizeString(event.keyword),
    city: normalizeString(event.city),
    district: normalizeString(event.district),
    employmentType: normalizeString(event.employmentType),
    education: normalizeString(event.education),
    recommendedOnly: event.recommendedOnly === true || event.recommendedOnly === 'true',
  }

  const condition = buildCondition(payload)
  const skip = (payload.page - 1) * payload.pageSize

  try {
    const [countRes, listRes, favoriteIds] = await Promise.all([
      db.collection('employment_jobs').where(condition).count(),
      db.collection('employment_jobs')
        .where(condition)
        .orderBy('updatedAt', 'desc')
        .skip(skip)
        .limit(payload.pageSize)
        .get(),
      getFavoriteIds(OPENID),
    ])

    const total = countRes.total || 0
    const list = (listRes.data || []).map((item) => ({
      ...item,
      isFollowed: favoriteIds.has(item._id),
    }))

    return {
      success: true,
      data: {
        list,
        pagination: {
          page: payload.page,
          pageSize: payload.pageSize,
          total,
          hasMore: skip + list.length < total,
        },
        filters: {
          keyword: payload.keyword,
          city: payload.city,
          district: payload.district,
          employmentType: payload.employmentType,
          education: payload.education,
          recommendedOnly: payload.recommendedOnly,
        },
      }
    }
  } catch (error) {
    console.error('获取岗位列表失败', error)
    return {
      success: false,
      message: '获取岗位列表失败',
      error,
    }
  }
}
