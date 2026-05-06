const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const _ = db.command

const formatNow = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const formatFutureIso = (offsetMs = 0) => {
  return new Date(Date.now() + offsetMs).toISOString()
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const programId = event && event.programId ? `${event.programId}` : ''

  if (!programId) {
    return {
      success: false,
      message: '缺少培训项目 ID'
    }
  }

  try {
    const programRes = await db.collection('training_programs').doc(programId).get()
    const program = programRes.data

    if (!program || program.isActive === false) {
      return {
        success: false,
        message: '培训项目不存在或已下线'
      }
    }

    if (program.programStatus !== '报名中') {
      return {
        success: false,
        message: '当前课程暂未开放报名'
      }
    }

    if (typeof program.capacity === 'number' && typeof program.enrolledCount === 'number' && program.enrolledCount >= program.capacity) {
      return {
        success: false,
        message: '当前课程报名人数已满'
      }
    }

    const existedRes = await db.collection('user_training_registrations')
      .where({
        userId: OPENID,
        programId,
      })
      .limit(1)
      .get()

    if (existedRes.data && existedRes.data.length) {
      return {
        success: true,
        message: '你已报名该课程',
        data: existedRes.data[0]
      }
    }

    const now = formatNow()
    const registration = {
      userId: OPENID,
      programId,
      providerId: program.providerId,
      regionId: program.regionId,
      title: program.title,
      providerName: program.providerName,
      category: program.category,
      address: program.address,
      stage: '审核中',
      registeredAt: now,
      updatedAt: now,
      trainingStartAt: program.trainingStartAt,
      trainingEndAt: program.trainingEndAt,
      certificateAvailable: !!program.certificateAvailable,
      certificateName: program.certificateName || '',
      certificateLevel: program.certificateLevel || '',
      auditNote: '报名已提交，等待审核机构确认。',
      completionNote: '',
      autoApproveAt: formatFutureIso(3000),
    }

    const addRes = await db.collection('user_training_registrations').add({
      data: registration
    })

    await db.collection('training_programs').doc(programId).update({
      data: {
        enrolledCount: _.inc(1),
      }
    })

    return {
      success: true,
      data: {
        _id: addRes._id,
        ...registration,
      }
    }
  } catch (error) {
    console.error('提交培训报名失败', error)
    return {
      success: false,
      message: '提交培训报名失败',
      error,
    }
  }
}
