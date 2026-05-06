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

const getMonthLabel = (dateString) => {
  const month = parseInt(dateString.slice(5, 7), 10)
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return labels[month - 1] || ''
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const weightKg = Number(event && event.weightKg)

  if (!weightKg || Number.isNaN(weightKg) || weightKg < 20 || weightKg > 300) {
    return {
      success: false,
      message: '请输入有效体重'
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
    const heightCm = fallbackProfile && fallbackProfile.heightCm ? fallbackProfile.heightCm : 175
    const lastLogWeight = latestLogRes && latestLogRes.data && latestLogRes.data.length ? latestLogRes.data[0].weightKg : null
    const baselineWeight = Number.isFinite(lastLogWeight)
      ? lastLogWeight
      : existedProfile && Number.isFinite(existedProfile.latestWeightKg)
        ? existedProfile.latestWeightKg
        : null

    if (Number.isFinite(baselineWeight) && Math.abs(weightKg - baselineWeight) > 20) {
      return {
        success: false,
        message: '体重变化超过20kg，请确认是否输入错误'
      }
    }
    const goalWeightKg = fallbackProfile && fallbackProfile.goalWeightKg ? fallbackProfile.goalWeightKg : weightKg
    const bmi = Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1))
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
          : 'Veteran',
      avatarUrl: existedProfile && existedProfile.avatarUrl
        ? existedProfile.avatarUrl
        : userRes && userRes.data && userRes.data.avatar
          ? userRes.data.avatar
          : fallbackProfile && fallbackProfile.avatarUrl
            ? fallbackProfile.avatarUrl
            : '',
      heightCm,
      latestWeightKg: weightKg,
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

    await db.collection('user_health_logs').add({
      data: {
        userId: OPENID,
        weightKg,
        recordedAt: today,
        recordedMonthLabel: getMonthLabel(today),
        heightCmSnapshot: heightCm,
        bmi,
      }
    })

    return {
      success: true,
      data: nextProfile,
    }
  } catch (error) {
    console.error('保存健康记录失败', error)
    return {
      success: false,
      message: '保存健康记录失败',
      error,
    }
  }
}
