const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const _ = db.command

const normalizeString = (value) => `${value || ''}`.trim()

const getFavoriteIds = async (userId) => {
  const userRes = await db.collection('employment_favorites').where({ userId, targetType: 'job' }).limit(50).get()
  const list = userRes.data || []
  return new Set(list.map((item) => item.targetId).filter(Boolean))
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const jobId = normalizeString(event.jobId)

  if (!jobId) {
    return { success: false, message: '缺少岗位编号' }
  }

  try {
    const jobRes = await db.collection('employment_jobs').doc(jobId).get()
    const jobInfo = jobRes.data

    if (!jobInfo) {
      return { success: false, message: '岗位不存在' }
    }

    let companyInfo = null
    if (jobInfo.companyId) {
      const companyRes = await db.collection('employment_companies').where({ _id: jobInfo.companyId }).limit(1).get()
      companyInfo = companyRes.data && companyRes.data.length ? companyRes.data[0] : null
    }

    const favoriteIds = await getFavoriteIds(OPENID)

    return {
      success: true,
      data: {
        ...jobInfo,
        isFollowed: favoriteIds.has(jobInfo._id),
        contactName: jobInfo.contactName || (companyInfo ? companyInfo.contactName : ''),
        contactPhone: jobInfo.contactPhone || (companyInfo ? companyInfo.contactPhone : ''),
        companyAddress: jobInfo.companyAddress || (companyInfo ? companyInfo.address : ''),
      }
    }
  } catch (error) {
    console.error('获取岗位详情失败', error)
    return {
      success: false,
      message: '获取岗位详情失败',
      error,
    }
  }
}
