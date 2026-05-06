const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const DEFAULT_REGION_ID = 'jx_fuzhou'

exports.main = async (event = {}) => {
  const regionId = event && event.regionId ? `${event.regionId}` : DEFAULT_REGION_ID

  try {
    const guideRes = await db.collection('regional_veteran_guides').doc(regionId).get()
    const detail = guideRes && guideRes.data ? guideRes.data : null

    return {
      success: true,
      data: {
        regionId,
        regionName: detail && detail.regionName ? detail.regionName : '当前地区',
        steps: detail && Array.isArray(detail.steps) ? detail.steps : [],
        updatedAt: detail && detail.updatedAt ? detail.updatedAt : '',
      }
    }
  } catch (error) {
    console.error('获取地区退伍指引失败', error)
    return {
      success: false,
      message: '获取地区退伍指引失败',
      error,
    }
  }
}
