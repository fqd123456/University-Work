const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    const userRes = await db.collection('users').doc(OPENID).get()
    const userData = userRes.data

    if (!userData) {
      return { registered: false }
    }

    return {
      registered: true,
      isLogin: userData.is_login === true,
      data: {
        name: userData.real_name || userData.nickname,
        nickname: userData.nickname,
        real_name: userData.real_name || '',
        avatar: userData.avatar,
        phone: userData.phone || '',
        gender: userData.gender || '',
        service_region: userData.service_region || '',
        bio: userData.bio || '',
        auditStatus: userData.audit_status,
        openid: OPENID
      }
    }
  } catch (e) {
    return { registered: false }
  }
}
