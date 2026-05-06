const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const DEFAULT_REGION_ID = 'jx_fuzhou'

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

exports.main = async (event = {}) => {
  const regionId = event && event.regionId ? `${event.regionId}` : DEFAULT_REGION_ID

  try {
    const [listRes, countRes] = await Promise.all([
      db.collection('regional_martyrs_directory')
        .where({ regionId })
        .orderBy('sacrificeDate', 'desc')
        .limit(100)
        .get(),
      db.collection('regional_martyrs_directory')
        .where({ regionId })
        .count(),
    ])

    const martyrList = normalizeArray(listRes.data)
    const firstItem = martyrList.length ? martyrList[0] : null

    return {
      success: true,
      data: {
        regionId,
        regionName: firstItem && firstItem.regionName ? firstItem.regionName : '当前地区',
        martyrList,
        summary: {
          total: countRes.total || 0,
        },
      }
    }
  } catch (error) {
    console.error('获取烈士英名录首页数据失败', error)
    return {
      success: false,
      message: '获取烈士英名录首页数据失败',
      error,
    }
  }
}
