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

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const goalWeightKg = Number(event && event.goalWeightKg)

  if (!goalWeightKg || Number.isNaN(goalWeightKg) || goalWeightKg < 20 || goalWeightKg > 300) {
    return {
      success: false,
      message: '请输入有效目标体重'
    }
  }

  try {
    const [profileRes, templateRes, userRes, latestLogRes] = await Promise.all([
      db.collection('user_health_profiles').where({ userId: OPENID }).limit(1).get(),
      db.collection('user_health_profiles').where({ userId: TEMPLATE_USER_ID }).limit(1).get(),
      db.collection('users').doc(OPENID).get().catch(() => ({ data: null })),
      db.collection('user_health_logs').where({ userId: OPENID }).orderBy('recordedAt', 'desc').limit(1).get(),
    ])

    const existedProfile = profileRes.data && profileRes.data.length ? profileRes.data[0] : null
    const templateProfile = templateRes.data && templateRes.data.length ? templateRes.data[0] : null
    const fallbackProfile = existedProfile || templateProfile || null
    const latestLog = latestLogRes.data && latestLogRes.data.length ? latestLogRes.data[0] : null
    const latestWeightKg = existedProfile && existedProfile.latestWeightKg
      ? existedProfile.latestWeightKg
      : latestLog && latestLog.weightKg
        ? latestLog.weightKg
        : fallbackProfile && fallbackProfile.latestWeightKg
          ? fallbackProfile.latestWeightKg
          : 0
    const heightCm = existedProfile && existedProfile.heightCm
      ? existedProfile.heightCm
      : fallbackProfile && fallbackProfile.heightCm
        ? fallbackProfile.heightCm
        : 175
    const bmi = existedProfile && existedProfile.bmi
      ? existedProfile.bmi
      : heightCm > 0 && latestWeightKg > 0
        ? Number((latestWeightKg / Math.pow(heightCm / 100, 2)).toFixed(1))
        : 0
    const today = formatNow()

    const nextProfile = {
      userId: OPENID,
      displayName: existedProfile && existedProfile.displayName
        ? existedProfile.displayName
        : userRes && userRes.data && (userRes.data.nickname || userRes.data.real_name)
          ? (userRes.data.nickname || userRes.data.real_name)
          : fallbackProfile && fallbackProfile.displayName
            ? fallbackProfile.displayName
            : '退役军人',
      roleLabel: existedProfile && existedProfile.roleLabel
        ? existedProfile.roleLabel
        : fallbackProfile && fallbackProfile.roleLabel
          ? fallbackProfile.roleLabel
          : '退役军人',
      avatarUrl: existedProfile && existedProfile.avatarUrl
        ? existedProfile.avatarUrl
        : userRes && userRes.data && userRes.data.avatar
          ? userRes.data.avatar
          : fallbackProfile && fallbackProfile.avatarUrl
            ? fallbackProfile.avatarUrl
            : '',
      heightCm,
      latestWeightKg,
      goalWeightKg,
      bmi,
      updatedAt: `${today} 09:00`,
    }

    if (existedProfile) {
      await db.collection('user_health_profiles').doc(existedProfile._id).update({
        data: nextProfile
      })
    } else {
      await db.collection('user_health_profiles').add({
        data: nextProfile
      })
    }

    return {
      success: true,
      data: nextProfile,
    }
  } catch (error) {
    console.error('更新目标体重失败', error)
    return {
      success: false,
      message: '更新目标体重失败',
      error,
    }
  }
}
