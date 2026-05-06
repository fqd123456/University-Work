const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const _ = db.command

const VALID_TARGET_TYPES = ['job', 'event']

const normalizeString = (value) => `${value || ''}`.trim()

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const targetType = normalizeString(event.targetType)
  const targetId = normalizeString(event.targetId)

  if (!VALID_TARGET_TYPES.includes(targetType)) {
    return { success: false, message: '关注类型不正确' }
  }

  if (!targetId) {
    return { success: false, message: '缺少目标信息' }
  }

  const collectionName = targetType === 'job' ? 'employment_jobs' : 'employment_events'

  try {
    const [targetRes, favoriteRes] = await Promise.all([
      db.collection(collectionName).doc(targetId).get(),
      db.collection('employment_favorites').where({ userId: OPENID, targetType, targetId }).limit(1).get(),
    ])

    if (!targetRes.data) {
      return { success: false, message: '目标不存在或已下线' }
    }

    if (targetType === 'event') {
      const endedAt = new Date(`${targetRes.data.endAt || ''}`.replace(/-/g, '/')).getTime()
      if (!Number.isNaN(endedAt) && endedAt < Date.now()) {
        return { success: false, message: '活动已结束，无法关注' }
      }
    }

    if (favoriteRes.data && favoriteRes.data.length) {
      await db.collection('employment_favorites').where({
        _id: _.in(favoriteRes.data.map((item) => item._id))
      }).remove()

      return {
        success: true,
        data: { isFollowed: false },
        message: '已取消关注',
      }
    }

    const now = new Date().toISOString()
    await db.collection('employment_favorites').add({
      data: {
        userId: OPENID,
        targetType,
        targetId,
        createdAt: now,
        updatedAt: now,
      }
    })

    return {
      success: true,
      data: { isFollowed: true },
      message: '已加入关注',
    }
  } catch (error) {
    console.error('切换关注状态失败', error)
    return {
      success: false,
      message: '切换关注状态失败',
      error,
    }
  }
}
