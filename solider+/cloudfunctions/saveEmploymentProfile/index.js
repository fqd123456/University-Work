const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const normalizeHighlights = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => `${item || ''}`.trim())
      .filter(Boolean)
      .slice(0, 10)
  }

  if (typeof value === 'string') {
    return value
      .split(/[，,]/)
      .map((item) => `${item || ''}`.trim())
      .filter(Boolean)
      .slice(0, 10)
  }

  return []
}

const normalizeStringArray = (value, max = 8) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => `${item || ''}`.trim())
    .filter(Boolean)
    .slice(0, max)
}

const calculateCompleteness = (profile) => {
  const checks = [
    !!profile.fullName,
    !!profile.birthDate,
    !!profile.targetPosition,
    !!profile.targetCity,
    !!profile.expectedSalary,
    !!profile.phone,
    !!profile.idPhoto,
    normalizeStringArray(profile.certificates).length > 0,
    !!profile.bio,
  ]

  const passed = checks.filter(Boolean).length
  return Math.round((passed / checks.length) * 100)
}

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
  const payload = event || {}

  try {
    const userRes = await db.collection('users').doc(OPENID).get().catch(() => ({ data: null }))
    const userDoc = userRes.data || {}
    const fullName = `${userDoc.real_name || userDoc.realName || ''}`.trim()
    const birthDate = `${userDoc.birth_date || userDoc.birthDate || ''}`.trim()

    if (!fullName) {
      return {
        success: false,
        message: '请先完成退役军人身份认证并填写真实姓名'
      }
    }

    const nextProfile = {
      userId: OPENID,
      fullName,
      birthDate,
      targetPosition: `${payload.targetPosition || ''}`.trim(),
      targetCity: `${payload.targetCity || ''}`.trim(),
      expectedSalary: `${payload.expectedSalary || ''}`.trim(),
      phone: `${payload.phone || userDoc.phone || ''}`.trim(),
      bio: `${payload.bio || ''}`.trim(),
      highlights: normalizeHighlights(payload.highlights),
      idPhoto: `${payload.idPhoto || ''}`.trim(),
      certificates: normalizeStringArray(payload.certificates, 12),
      certificateNames: normalizeStringArray(payload.certificateNames, 12),
      lastUpdatedAt: formatNow(),
    }

    nextProfile.completeness = calculateCompleteness(nextProfile)

    if (!nextProfile.targetPosition || !nextProfile.targetCity || !nextProfile.phone) {
      return {
        success: false,
        message: '请至少填写意向岗位、意向工作地和联系电话'
      }
    }

    const existedRes = await db.collection('employment_profiles').where({ userId: OPENID }).limit(1).get()

    if (existedRes.data && existedRes.data.length) {
      await db.collection('employment_profiles').doc(existedRes.data[0]._id).update({
        data: nextProfile
      })
    } else {
      await db.collection('employment_profiles').add({
        data: nextProfile
      })
    }

    return {
      success: true,
      data: nextProfile
    }
  } catch (error) {
    console.error('保存简历失败', error)
    return {
      success: false,
      message: '保存简历失败',
      error,
    }
  }
}
