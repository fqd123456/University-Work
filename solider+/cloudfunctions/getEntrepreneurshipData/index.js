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
    const [companiesRes, officeRes] = await Promise.all([
      db.collection('entrepreneurship_companies')
        .where({
          regionId,
          isActive: true,
        })
        .orderBy('updatedAt', 'desc')
        .limit(20)
        .get(),
      db.collection('regional_entrepreneurship_offices').doc(regionId).get(),
    ])

    const companies = normalizeArray(companiesRes.data)
      .sort((left, right) => {
        if (left.isFeatured === right.isFeatured) {
          return `${right.updatedAt || ''}`.localeCompare(`${left.updatedAt || ''}`)
        }

        return left.isFeatured ? -1 : 1
      })

    const office = officeRes && officeRes.data ? officeRes.data : null

    return {
      success: true,
      data: {
        regionId,
        regionName: office && office.regionName ? office.regionName : '当前地区',
        mentorCompanies: companies,
        office,
        overview: {
          mentorCompanyCount: companies.length,
          featuredCompanyCount: companies.filter((item) => item && item.isFeatured).length,
          hasOffice: !!office,
        }
      }
    }
  } catch (error) {
    console.error('获取创业扶持数据失败', error)
    return {
      success: false,
      message: '获取创业扶持数据失败',
      error,
    }
  }
}
