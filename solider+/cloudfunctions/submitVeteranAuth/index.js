const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const normalizeString = (value) => `${value || ''}`.trim()

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()

  const payload = {
    realName: normalizeString(event.realName),
    placementRegion: normalizeString(event.placementRegion),
    phone: normalizeString(event.phone),
    idNumber: normalizeString(event.idNumber),
    note: normalizeString(event.note),
  }

  if (!payload.realName || !payload.placementRegion || !payload.phone) {
    return {
      success: false,
      message: '请完善真实姓名、安置地和手机号'
    }
  }

  const now = Date.now()

  try {
    await db.collection('users').doc(OPENID).update({
      data: {
        real_name: payload.realName,
        service_region: payload.placementRegion,
        placement_region: payload.placementRegion,
        phone: payload.phone,
        veteran_id_number: payload.idNumber,
        veteran_placement_region: payload.placementRegion,
        veteran_auth_note: payload.note,
        audit_status: 'pending',
        audit_submitted_at: now,
      }
    }).catch(async () => {
      await db.collection('users').add({
        data: {
          _id: OPENID,
          real_name: payload.realName,
          service_region: payload.placementRegion,
          placement_region: payload.placementRegion,
          phone: payload.phone,
          veteran_id_number: payload.idNumber,
          veteran_placement_region: payload.placementRegion,
          veteran_auth_note: payload.note,
          audit_status: 'pending',
          audit_submitted_at: now,
        }
      })
    })

    const userRes = await db.collection('users').doc(OPENID).get()

    return {
      success: true,
      data: userRes.data || null,
      message: '已提交认证，进入审核中'
    }
  } catch (error) {
    console.error('提交认证失败', error)
    return {
      success: false,
      message: '提交认证失败',
      error,
    }
  }
}
