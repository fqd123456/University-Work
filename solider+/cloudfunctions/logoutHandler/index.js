const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 核心操作：将登录状态抹掉
    await db.collection('users').doc(OPENID).update({
      data: {
        is_login: false,           // 关键：标记为离线
        last_logout: db.serverDate() // 记录退出时间（可选，用于审计）
      }
    })
    return { success: true, msg: '注销成功' }
  } catch (err) {
    console.error('注销失败', err)
    return { success: false, msg: '注销失败', error: err }
  }
}