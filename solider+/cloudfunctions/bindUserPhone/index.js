const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const code = event && event.code ? `${event.code}`.trim() : ''

  if (!code) {
    return {
      success: false,
      message: '缺少手机号授权码'
    }
  }

  try {
    const phoneResult = await cloud.openapi.phonenumber.getPhoneNumber({
      code,
    })

    const phoneInfo = phoneResult && phoneResult.phone_info
      ? phoneResult.phone_info
      : phoneResult && phoneResult.phoneInfo
        ? phoneResult.phoneInfo
        : null

    const phoneNumber = phoneInfo && phoneInfo.phoneNumber
      ? `${phoneInfo.phoneNumber}`.trim()
      : phoneInfo && phoneInfo.purePhoneNumber
        ? `${phoneInfo.purePhoneNumber}`.trim()
        : ''

    if (!phoneNumber) {
      return {
        success: false,
        message: '获取手机号失败'
      }
    }

    const phoneUpdateData = {
      phone: phoneNumber,
      phone_country_code: phoneInfo && phoneInfo.countryCode ? `${phoneInfo.countryCode}` : '86',
      phone_bound_at: db.serverDate(),
    }

    await db.collection('users').doc(OPENID).update({
      data: phoneUpdateData
    }).catch(async () => {
      await db.collection('users').add({
        data: {
          _id: OPENID,
          nickname: '微信用户',
          avatar: '',
          real_name: '',
          gender: '',
          service_region: '',
          bio: '',
          role: 0,
          is_login: true,
          createTime: db.serverDate(),
          last_login: db.serverDate(),
          ...phoneUpdateData,
        }
      })
    })

    const userRes = await db.collection('users').doc(OPENID).get()

    return {
      success: true,
      data: userRes.data || null,
      phoneInfo,
    }
  } catch (error) {
    console.error('绑定手机号失败', error)
    return {
      success: false,
      message: '绑定手机号失败',
      error,
    }
  }
}
