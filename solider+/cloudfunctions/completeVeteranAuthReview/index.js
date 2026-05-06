const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    await db.collection('users').doc(OPENID).update({
      data: {
        audit_status: 'approved',
        audit_completed_at: Date.now(),
      }
    })

    const userRes = await db.collection('users').doc(OPENID).get()

    return {
      success: true,
      data: userRes.data || null,
      message: '认证成功'
    }
  } catch (error) {
    console.error('更新认证状态失败', error)
    return {
      success: false,
      message: '更新认证状态失败',
      error,
    }
  }
}
