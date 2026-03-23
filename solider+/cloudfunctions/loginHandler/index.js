// cloudfunctions/login_handler/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { userInfo } = event 
  const safeUserInfo = userInfo || {}

  try {
    const userRes = await db.collection('users').doc(OPENID).get()
    const userData = userRes.data
  
    // 情况 A：用户已经登录了，直接返回
    if (userData.is_login === true) {
      return { success: true, isNew: false, data: userData, msg: '已在登录状态' }
    }
  
    // 情况 B：用户存在但处于注销状态 (is_login === false)
    // 此时我们需要执行“重新登录”的动作
    await db.collection('users').doc(OPENID).update({
      data: {
        is_login: true,
        last_login: db.serverDate(),
        // 如果用户在登录页更新了头像昵称，这里也可以顺便更新
        nickname: safeUserInfo.nickName || userData.nickname,
        avatar: safeUserInfo.avatarUrl || userData.avatar
      }
    })
    const updatedUser = {
      ...userData,
      is_login: true,
      last_login: db.serverDate(),
      nickname: safeUserInfo.nickName || userData.nickname,
      avatar: safeUserInfo.avatarUrl || userData.avatar
    }
    return { success: true, isNew: false, data: updatedUser, msg: '登录成功' }
  
  } catch (e) {
    // 情况 C：全新用户（报错进入此处）
    const newUser = {
      _id: OPENID,
      nickname: safeUserInfo.nickName || '微信用户',
      avatar: safeUserInfo.avatarUrl || '',
      role: 0,
      is_login: true, // 注册即登录
      createTime: db.serverDate(),
      last_login: db.serverDate()
    }
    await db.collection('users').add({ data: newUser })
    return { success: true, isNew: true, data: newUser, msg: '注册并登录成功' }
  }
}
