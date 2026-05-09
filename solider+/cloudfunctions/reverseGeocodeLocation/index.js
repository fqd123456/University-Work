const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const REQUEST_TIMEOUT = 10000

const normalizeCityName = (value) => `${value || ''}`.trim().replace(/市$/u, '市')

const requestJson = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json,*/*',
      },
    }, (res) => {
      const chunks = []

      res.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })

      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')

        if ((res.statusCode || 500) >= 400) {
          reject(new Error(`request failed: ${res.statusCode}`))
          return
        }

        try {
          resolve(JSON.parse(text))
        } catch (error) {
          reject(error)
        }
      })

      res.on('error', reject)
    })

    req.setTimeout(REQUEST_TIMEOUT, () => {
      req.destroy(new Error('request timeout'))
    })

    req.on('error', reject)
  })
}

exports.main = async (event = {}) => {
  try {
    const latitude = Number(event.latitude)
    const longitude = Number(event.longitude)
    const mapKey = `${event.apiKey || process.env.TARO_APP_TENCENT_MAP_KEY || ''}`.trim()

    if (!mapKey) {
      return {
        success: false,
        message: '缺少腾讯地图Key',
      }
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        success: false,
        message: '坐标不合法',
      }
    }

    const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=${encodeURIComponent(mapKey)}&get_poi=0`
    const result = await requestJson(url)
    const addressComponent = result && result.result ? result.result.address_component || {} : {}
    const city = normalizeCityName(addressComponent.city || '')
    const province = `${addressComponent.province || ''}`.trim()

    if (!city) {
      return {
        success: false,
        message: '未解析到城市',
      }
    }

    return {
      success: true,
      data: {
        city,
        province,
      },
    }
  } catch (error) {
    console.error('反查地理位置失败', error)
    return {
      success: false,
      message: '反查地理位置失败',
      error,
    }
  }
}
