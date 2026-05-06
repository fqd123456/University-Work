const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const TEMPLATE_USER_ID = '__template__'

const formatNow = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const removeUserLogs = async (userId) => {
  let removedCount = 0

  while (true) {
    const listRes = await db.collection('user_health_logs').where({ userId }).limit(100).get()
    const items = listRes.data || []

    if (!items.length) {
      break
    }

    await Promise.all(items.map((item) => db.collection('user_health_logs').doc(item._id).remove()))
    removedCount += items.length

    if (items.length < 100) {
      break
    }
  }

  return removedCount
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const [removedCount, profileRes, templateRes, userRes] = await Promise.all([
      removeUserLogs(OPENID),
      db.collection('user_health_profiles').where({ userId: OPENID }).limit(1).get(),
      db.collection('user_health_profiles').where({ userId: TEMPLATE_USER_ID }).limit(1).get(),
      db.collection('users').doc(OPENID).get().catch(() => ({ data: null })),
    ])
    const existedProfile = profileRes.data && profileRes.data.length ? profileRes.data[0] : null
    const templateProfile = templateRes.data && templateRes.data.length ? templateRes.data[0] : null

    if (!existedProfile) {
      const today = formatNow()

      await db.collection('user_health_profiles').add({
        data: {
          userId: OPENID,
          displayName: userRes && userRes.data && (userRes.data.nickname || userRes.data.real_name)
            ? (userRes.data.nickname || userRes.data.real_name)
            : templateProfile && templateProfile.displayName
              ? templateProfile.displayName
              : '退役军人',
          roleLabel: templateProfile && templateProfile.roleLabel
            ? templateProfile.roleLabel
            : '退役军人',
          avatarUrl: userRes && userRes.data && userRes.data.avatar
            ? userRes.data.avatar
            : templateProfile && templateProfile.avatarUrl
              ? templateProfile.avatarUrl
              : '',
          heightCm: templateProfile && templateProfile.heightCm ? templateProfile.heightCm : 0,
          latestWeightKg: templateProfile && templateProfile.latestWeightKg ? templateProfile.latestWeightKg : 0,
          goalWeightKg: templateProfile && templateProfile.goalWeightKg ? templateProfile.goalWeightKg : 0,
          bmi: templateProfile && templateProfile.bmi ? templateProfile.bmi : 0,
          updatedAt: `${today} 09:00`,
        }
      })
    }

    return {
      success: true,
      data: {
        removedCount,
      }
    }
  } catch (error) {
    console.error('清空健康记录失败', error)
    return {
      success: false,
      message: '清空健康记录失败',
      error,
    }
  }
}
