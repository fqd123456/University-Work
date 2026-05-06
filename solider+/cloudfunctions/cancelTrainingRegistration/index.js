const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const _ = db.command

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const registrationId = event && event.registrationId ? `${event.registrationId}` : ''
  const programId = event && event.programId ? `${event.programId}` : ''

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

    if (registration.stage !== '审核中' && registration.stage !== '待开班') {
      return {
        success: false,
        message: '当前状态不可退选'
      }
    }

    await db.collection('user_training_registrations').doc(registrationId).remove()

    if (programId) {
      await db.collection('training_programs').doc(programId).update({
        data: {
          enrolledCount: _.inc(-1),
        }
      }).catch(() => null)
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('退选培训报名失败', error)
    return {
      success: false,
      message: '退选培训报名失败',
      error,
    }
  }
}
