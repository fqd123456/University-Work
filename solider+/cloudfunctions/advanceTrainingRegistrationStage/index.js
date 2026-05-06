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

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const registrationId = event && event.registrationId ? `${event.registrationId}` : ''

  if (!registrationId) {
    return {
      success: false,
      message: '缺少报名记录 ID'
    }
  }

  try {
    const registrationRes = await db.collection('user_training_registrations').doc(registrationId).get()
    const registration = registrationRes.data

    if (!registration || registration.userId !== OPENID) {
      return {
        success: false,
        message: '报名记录不存在'
      }
    }

    if (registration.stage !== '审核中') {
      return {
        success: true,
        data: registration,
      }
    }

    const nextRegistration = {
      ...registration,
      stage: '待开班',
      auditNote: '审核已完成，请留意开班通知并按时参加培训。',
      updatedAt: formatNow(),
    }

    await db.collection('user_training_registrations').doc(registrationId).update({
      data: {
        stage: nextRegistration.stage,
        auditNote: nextRegistration.auditNote,
        updatedAt: nextRegistration.updatedAt,
      }
    })

    return {
      success: true,
      data: nextRegistration,
    }
  } catch (error) {
    console.error('推进培训报名状态失败', error)
    return {
      success: false,
      message: '推进培训报名状态失败',
      error,
    }
  }
}
