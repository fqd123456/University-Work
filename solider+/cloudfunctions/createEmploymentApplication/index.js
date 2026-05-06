const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const formatNow = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const jobId = event && event.jobId ? `${event.jobId}` : ''

  if (!jobId) {
    return {
      success: false,
      message: '缺少岗位 ID'
    }
  }

  try {
    const jobRes = await db.collection('employment_jobs').doc(jobId).get()
    const job = jobRes.data

    if (!job || job.isActive === false) {
      return {
        success: false,
        message: '岗位不存在或已下架'
      }
    }

    const existedRes = await db.collection('employment_applications')
      .where({
        userId: OPENID,
        jobId,
      })
      .limit(1)
      .get()

    if (existedRes.data && existedRes.data.length) {
      return {
        success: true,
        message: '你已投递过该岗位',
        data: existedRes.data[0]
      }
    }

    const application = {
      userId: OPENID,
      jobId: job._id,
      jobName: job.jobName,
      companyId: job.companyId,
      companyName: job.companyName,
      stage: '已投递',
      note: '已提交应聘申请，等待企业查看。',
      appliedAt: formatNow(),
      updatedAt: formatNow(),
      isTemplate: false,
    }

    const addRes = await db.collection('employment_applications').add({
      data: application
    })

    return {
      success: true,
      data: {
        _id: addRes._id,
        ...application,
      }
    }
  } catch (error) {
    console.error('提交应聘记录失败', error)
    return {
      success: false,
      message: '提交应聘记录失败',
      error,
    }
  }
}
