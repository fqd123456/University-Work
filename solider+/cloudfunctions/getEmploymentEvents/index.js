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
  const conditions = []

  if (payload.city) {
    conditions.push({ city: payload.city })
  }

  if (payload.eventType) {
    conditions.push({ eventType: payload.eventType })
  }

  if (payload.recommendedOnly) {
    conditions.push({ isRecommended: true })
  }

  if (payload.keyword) {
    const keywordRegExp = db.RegExp({
      regexp: escapeRegExp(payload.keyword),
      options: 'i',
    })

    conditions.push(_.or([
      { title: keywordRegExp },
      { organizer: keywordRegExp },
      { address: keywordRegExp },
    ]))
  }

  if (!conditions.length) {
    return {}
  }

  return conditions.length === 1 ? conditions[0] : _.and(conditions)
}

const getFavoriteIds = async (userId) => {
  const userRes = await db.collection('employment_favorites').where({ userId, targetType: 'event' }).limit(50).get()
  const list = userRes.data || []
  return new Set(list.map((item) => item.targetId).filter(Boolean))
}

const isEnded = (item) => {
  const endTime = new Date(`${item && item.endAt ? item.endAt : ''}`.replace(/-/g, '/'))
  if (Number.isNaN(endTime.getTime())) {
    return false
  }
  return endTime.getTime() < Date.now()
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const payload = {
    page: normalizePositiveInt(event.page, 1, 1000),
    pageSize: normalizePositiveInt(event.pageSize, 10, 20),
    keyword: normalizeString(event.keyword),
    city: normalizeString(event.city),
    eventType: normalizeString(event.eventType),
    recommendedOnly: event.recommendedOnly === true || event.recommendedOnly === 'true',
  }

  const condition = buildCondition(payload)
  const skip = (payload.page - 1) * payload.pageSize

  try {
    const [countRes, listRes, favoriteIds] = await Promise.all([
      db.collection('employment_events').where(condition).count(),
      db.collection('employment_events').where(condition).limit(100).get(),
      getFavoriteIds(OPENID),
    ])

    const total = countRes.total || 0
    const sortedList = (listRes.data || [])
      .map((item) => {
        const ended = isEnded(item)
        const isFollowed = favoriteIds.has(item._id)
        return {
          ...item,
          isFollowed,
          displayStatus: ended ? '已结束' : (isFollowed ? '已关注' : '关注'),
        }
      })
      .sort((prev, next) => {
        const prevEnded = prev.displayStatus === '已结束'
        const nextEnded = next.displayStatus === '已结束'

        if (prevEnded !== nextEnded) {
          return prevEnded ? 1 : -1
        }

        return new Date(prev.startAt.replace(/-/g, '/')).getTime() - new Date(next.startAt.replace(/-/g, '/')).getTime()
      })

    const pageList = sortedList.slice(skip, skip + payload.pageSize)

    return {
      success: true,
      data: {
        list: pageList,
        pagination: {
          page: payload.page,
          pageSize: payload.pageSize,
          total,
          hasMore: skip + pageList.length < total,
        },
        filters: {
          keyword: payload.keyword,
          city: payload.city,
          eventType: payload.eventType,
          recommendedOnly: payload.recommendedOnly,
        },
      }
    }
  } catch (error) {
    console.error('获取招聘活动失败', error)
    return {
      success: false,
      message: '获取招聘活动失败',
      error,
    }
  }
}
