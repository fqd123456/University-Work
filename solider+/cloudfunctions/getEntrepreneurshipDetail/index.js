const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const DEFAULT_REGION_ID = 'jx_fuzhou'

exports.main = async (event = {}) => {
  const type = event && event.type ? `${event.type}` : ''
  const companyId = event && event.companyId ? `${event.companyId}` : ''
  const regionId = event && event.regionId ? `${event.regionId}` : DEFAULT_REGION_ID

  try {
    if (type === 'company') {
      if (!companyId) {
        return {
          success: false,
          message: '缺少企业 ID'
        }
      }

      const companyRes = await db.collection('entrepreneurship_companies').doc(companyId).get()

      return {
        success: true,
        data: {
          type,
          detail: companyRes.data || null,
        }
      }
    }

    if (type === 'office') {
      const officeRes = await db.collection('regional_entrepreneurship_offices').doc(regionId).get()

      return {
        success: true,
        data: {
          type,
          detail: officeRes.data || null,
        }
      }
    }

    return {
      success: false,
      message: '不支持的详情类型'
    }
  } catch (error) {
    console.error('获取创业扶持详情失败', error)
    return {
      success: false,
      message: '获取创业扶持详情失败',
      error,
    }
  }
}
