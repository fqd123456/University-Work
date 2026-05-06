const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const {
    nickname,
    avatar,
    realName,
    gender,
    serviceRegion,
    birthDate,
    bio,
  } = event || {}

  const updateData = {}
  if (typeof nickname === 'string') {
    const nextNickname = nickname.trim()
    if (nextNickname) {
      updateData.nickname = nextNickname
    }
  }
  if (typeof avatar === 'string') {
    updateData.avatar = avatar
  }
  if (typeof realName === 'string') {
    updateData.real_name = realName.trim()
  }
  if (typeof gender === 'string') {
    updateData.gender = gender.trim()
  }
  if (typeof serviceRegion === 'string') {
    updateData.service_region = serviceRegion.trim()
  }
  if (typeof birthDate === 'string') {
    updateData.birth_date = birthDate.trim()
  }
  if (typeof bio === 'string') {
    updateData.bio = bio.trim()
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, msg: '无可更新字段' }
  }

  try {
    await db.collection('users').doc(OPENID).update({
      data: updateData
    }).catch(async () => {
      await db.collection('users').add({
        data: {
          _id: OPENID,
          ...updateData,
        }
      })
    })
    const userRes = await db.collection('users').doc(OPENID).get()
    return { success: true, data: userRes.data }
  } catch (err) {
    return { success: false, msg: '更新失败', error: err }
  }
}
