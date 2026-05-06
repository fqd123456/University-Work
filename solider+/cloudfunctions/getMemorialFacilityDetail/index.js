const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

exports.main = async (event = {}) => {
  const facilityId = event && event.facilityId ? `${event.facilityId}` : ''

  if (!facilityId) {
    return {
      success: false,
      message: '缺少纪念设施 ID'
    }
  }

  try {
    const detailRes = await db.collection('regional_memorial_facilities').doc(facilityId).get().catch(() => ({ data: null }))
    const detail = detailRes && detailRes.data ? detailRes.data : null

    if (!detail) {
      return {
        success: false,
        message: '未找到对应纪念设施'
      }
    }

    return {
      success: true,
      data: {
        detail,
      }
    }
  } catch (error) {
    console.error('获取烈士纪念设施详情失败', error)
    return {
      success: false,
      message: '获取烈士纪念设施详情失败',
      error,
    }
  }
}
