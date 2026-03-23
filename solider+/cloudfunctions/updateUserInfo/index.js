const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { nickname, avatar } = event || {}

  const updateData = {}
  if (typeof nickname === 'string' && nickname.trim()) {
    updateData.nickname = nickname.trim()
  }
  if (typeof avatar === 'string' && avatar) {
    updateData.avatar = avatar
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, msg: '无可更新字段' }
  }

  try {
    await db.collection('users').doc(OPENID).update({
      data: updateData
    })
    const userRes = await db.collection('users').doc(OPENID).get()
    return { success: true, data: userRes.data }
  } catch (err) {
    return { success: false, msg: '更新失败', error: err }
  }
}
