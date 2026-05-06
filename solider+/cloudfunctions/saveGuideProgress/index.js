const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const DEFAULT_REGION_ID = 'jx_fuzhou'

const formatNow = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const regionId = event && event.regionId ? `${event.regionId}` : DEFAULT_REGION_ID
  const stepId = event && event.stepId ? `${event.stepId}` : ''

  if (!stepId) {
    return {
      success: false,
      message: '缺少步骤 ID'
    }
  }

  try {
    const existedRes = await db.collection('user_guide_progress')
      .where({
        userId: OPENID,
        regionId,
      })
      .limit(1)
      .get()

    const now = formatNow()

    if (existedRes.data && existedRes.data.length) {
      const current = existedRes.data[0]
      const completedStepIds = Array.isArray(current.completedStepIds) ? current.completedStepIds : []

      if (!completedStepIds.includes(stepId)) {
        completedStepIds.push(stepId)
      }

      await db.collection('user_guide_progress').doc(current._id).update({
        data: {
          completedStepIds,
          updatedAt: now,
        }
      })

      return {
        success: true,
        data: {
          completedStepIds,
          updatedAt: now,
        }
      }
    }

    await db.collection('user_guide_progress').add({
      data: {
        userId: OPENID,
        regionId,
        completedStepIds: [stepId],
        updatedAt: now,
      }
    })

    return {
      success: true,
      data: {
        completedStepIds: [stepId],
        updatedAt: now,
      }
    }
  } catch (error) {
    console.error('保存退伍指引进度失败', error)
    return {
      success: false,
      message: '保存退伍指引进度失败',
      error,
    }
  }
}
