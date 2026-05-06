const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const userRes = await db.collection('users').doc(OPENID).get()

    return {
      success: true,
      data: userRes.data || null,
    }
  } catch (error) {
    console.error('获取用户资料失败', error)
    return {
      success: false,
      message: '获取用户资料失败',
      error,
    }
  }
}
