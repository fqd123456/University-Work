const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const TEMPLATE_USER_ID = '__template__'
const DEFAULT_MOTTO = '把走过的路，写成照亮后来人的光。'

const normalizeString = (value) => `${value || ''}`.trim()

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
  const motto = normalizeString(event.motto)

  if (!motto) {
    return {
      success: false,
      message: '请输入座右铭'
    }
  }

  if (motto.length > 40) {
    return {
      success: false,
      message: '座右铭不能超过 40 个字'
    }
  }

  try {
    const [profileRes, templateRes, userRes] = await Promise.all([
      db.collection('user_blog_profiles').where({ userId: OPENID }).limit(1).get(),
      db.collection('user_blog_profiles').where({ userId: TEMPLATE_USER_ID }).limit(1).get(),
      db.collection('users').doc(OPENID).get().catch(() => ({ data: null })),
    ])

    const existedProfile = profileRes.data && profileRes.data.length ? profileRes.data[0] : null
    const templateProfile = templateRes.data && templateRes.data.length ? templateRes.data[0] : null
    const userDoc = userRes && userRes.data ? userRes.data : null
    const now = formatNow()

    const nextProfile = {
      userId: OPENID,
      displayName: existedProfile && existedProfile.displayName
        ? existedProfile.displayName
        : userDoc && (userDoc.nickname || userDoc.real_name)
          ? (userDoc.nickname || userDoc.real_name)
          : templateProfile && templateProfile.displayName
            ? templateProfile.displayName
            : '退役军人',
      avatarUrl: existedProfile && existedProfile.avatarUrl
        ? existedProfile.avatarUrl
        : userDoc && userDoc.avatar
          ? userDoc.avatar
          : templateProfile && templateProfile.avatarUrl
            ? templateProfile.avatarUrl
            : '',
      motto: motto || (templateProfile && templateProfile.motto ? templateProfile.motto : DEFAULT_MOTTO),
      updatedAt: now,
    }

    if (existedProfile) {
      await db.collection('user_blog_profiles').doc(existedProfile._id).update({
        data: nextProfile
      })

      return {
        success: true,
        data: {
          ...existedProfile,
          ...nextProfile,
        }
      }
    }

    const addRes = await db.collection('user_blog_profiles').add({
      data: {
        ...nextProfile,
        createdAt: now,
      }
    })

    return {
      success: true,
      data: {
        _id: addRes._id,
        ...nextProfile,
        createdAt: now,
      }
    }
  } catch (error) {
    console.error('保存军魂记录资料失败', error)
    return {
      success: false,
      message: '保存军魂记录资料失败',
      error,
    }
  }
}
