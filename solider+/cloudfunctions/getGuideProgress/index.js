const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const DEFAULT_REGION_ID = 'jx_fuzhou'

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const regionId = event && event.regionId ? `${event.regionId}` : DEFAULT_REGION_ID

  try {
    const progressRes = await db.collection('user_guide_progress')
      .where({
        userId: OPENID,
        regionId,
      })
      .limit(1)
      .get()

    const progress = progressRes.data && progressRes.data.length ? progressRes.data[0] : null

    return {
      success: true,
      data: {
        userId: OPENID,
        regionId,
        completedStepIds: progress && Array.isArray(progress.completedStepIds) ? progress.completedStepIds : [],
        updatedAt: progress && progress.updatedAt ? progress.updatedAt : '',
      }
    }
  } catch (error) {
    console.error('获取退伍指引进度失败', error)
    return {
      success: false,
      message: '获取退伍指引进度失败',
      error,
    }
  }
}
