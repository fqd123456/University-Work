const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const TEMPLATE_USER_ID = '__template__'

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

const getUserProfile = async (userId) => {
  const userProfileRes = await db.collection('user_health_profiles').where({ userId }).limit(1).get()
  return userProfileRes.data && userProfileRes.data.length ? userProfileRes.data[0] : null
}

const getTemplateProfile = async () => {
  const templateRes = await db.collection('user_health_profiles').where({ userId: TEMPLATE_USER_ID }).limit(1).get()
  return templateRes.data && templateRes.data.length ? templateRes.data[0] : null
}

const getUserLogs = async (userId) => {
  const userLogsRes = await db.collection('user_health_logs')
    .where({ userId })
    .orderBy('recordedAt', 'asc')
    .limit(30)
    .get()

  return userLogsRes.data || []
}

const getTemplateLogs = async () => {
  const templateRes = await db.collection('user_health_logs')
    .where({ userId: TEMPLATE_USER_ID })
    .orderBy('recordedAt', 'asc')
    .limit(30)
    .get()

  return templateRes.data || []
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const [profile, templateProfile, userLogs, templateLogs, userRes] = await Promise.all([
      getUserProfile(OPENID),
      getTemplateProfile(),
      getUserLogs(OPENID),
      getTemplateLogs(),
      db.collection('users').doc(OPENID).get().catch(() => ({ data: null })),
    ])

    const healthLogs = normalizeArray(userLogs).length
      ? normalizeArray(userLogs)
      : profile
        ? []
        : normalizeArray(templateLogs)
    const profileData = profile || templateProfile
    const latestWeightKg = profile && profile.latestWeightKg
      ? profile.latestWeightKg
      : healthLogs.length
        ? healthLogs[healthLogs.length - 1].weightKg
        : 0

    const heightCm = profileData && profileData.heightCm ? profileData.heightCm : 0
    const bmi = profileData && profileData.bmi
      ? profileData.bmi
      : heightCm > 0 && latestWeightKg > 0
        ? Number((latestWeightKg / Math.pow(heightCm / 100, 2)).toFixed(1))
        : 0

    const displayName = profileData && profileData.displayName
      ? profileData.displayName
      : userRes && userRes.data && (userRes.data.nickname || userRes.data.real_name)
        ? (userRes.data.nickname || userRes.data.real_name)
        : '退役军人'

    const avatarUrl = profileData && profileData.avatarUrl
      ? profileData.avatarUrl
      : userRes && userRes.data && userRes.data.avatar
        ? userRes.data.avatar
        : ''
    const birthDate = profileData && profileData.birthDate
      ? profileData.birthDate
      : userRes && userRes.data && (userRes.data.birthDate || userRes.data.birthday || userRes.data.birth_date)
        ? (userRes.data.birthDate || userRes.data.birthday || userRes.data.birth_date)
        : ''

    return {
      success: true,
      data: {
        profile: {
          ...(profileData || {}),
          displayName,
          avatarUrl,
          birthDate,
          heightCm,
          latestWeightKg,
          goalWeightKg: profileData && profileData.goalWeightKg ? profileData.goalWeightKg : latestWeightKg,
          bmi,
        },
        logs: healthLogs,
      }
    }
  } catch (error) {
    console.error('获取健康管理数据失败', error)
    return {
      success: false,
      message: '获取健康管理数据失败',
      error,
    }
  }
}
