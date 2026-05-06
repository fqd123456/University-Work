const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

exports.main = async (event = {}) => {
  const martyrId = event && event.martyrId ? `${event.martyrId}` : ''

  if (!martyrId) {
    return {
      success: false,
      message: '缺少烈士 ID'
    }
  }

  try {
    const detailRes = await db.collection('regional_martyrs_directory').doc(martyrId).get().catch(() => ({ data: null }))
    const detail = detailRes && detailRes.data ? detailRes.data : null

    if (!detail) {
      return {
        success: false,
        message: '未找到对应烈士信息'
      }
    }

    return {
      success: true,
      data: {
        detail,
      }
    }
  } catch (error) {
    console.error('获取烈士详情失败', error)
    return {
      success: false,
      message: '获取烈士详情失败',
      error,
    }
  }
}
