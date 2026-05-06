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
      db.collection('regional_memorial_facilities')
        .where({ regionId })
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .get(),
      db.collection('regional_memorial_facilities')
        .where({ regionId })
        .count(),
    ])

    const facilityList = normalizeArray(listRes.data)
      .sort((left, right) => {
        if (!!left.isFeatured === !!right.isFeatured) {
          return `${right.updatedAt || ''}`.localeCompare(`${left.updatedAt || ''}`)
        }

        return left.isFeatured ? -1 : 1
      })
    const firstItem = facilityList.length ? facilityList[0] : null

    return {
      success: true,
      data: {
        regionId,
        regionName: firstItem && firstItem.regionName ? firstItem.regionName : '当前地区',
        facilityList,
        summary: {
          total: countRes.total || 0,
        },
      }
    }
  } catch (error) {
    console.error('获取烈士纪念设施首页数据失败', error)
    return {
      success: false,
      message: '获取烈士纪念设施首页数据失败',
      error,
    }
  }
}
