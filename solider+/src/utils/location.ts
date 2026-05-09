import Taro from '@tarojs/taro'

export const SETTLEMENT_PROVINCE = '江西省'
export const SETTLEMENT_CITY = '抚州市'
export const SETTLEMENT_REGION_NAME = `${SETTLEMENT_PROVINCE}${SETTLEMENT_CITY}`
export const SETTLEMENT_LABEL = '江西抚州'

type LocationCache = {
  city: string
  province: string
  expiresAt: number
}

type RealLocationInfo = {
  city: string
  province: string
  source: 'live' | 'cache' | 'fallback'
}

const LOCATION_CACHE_KEY = 'real_location_cache'
const LOCATION_CACHE_DURATION = 1000 * 60 * 60

const normalizeCityName = (value: string) => {
  return `${value || ''}`.trim().replace(/市$/u, '市')
}

const getCachedLocation = (): RealLocationInfo | null => {
  const cache = Taro.getStorageSync(LOCATION_CACHE_KEY) as LocationCache | null

  if (!cache || !cache.city || !cache.expiresAt || cache.expiresAt < Date.now()) {
    return null
  }

  return {
    city: cache.city,
    province: cache.province || '',
    source: 'cache',
  }
}

const setCachedLocation = (city: string, province: string) => {
  Taro.setStorageSync(LOCATION_CACHE_KEY, {
    city,
    province,
    expiresAt: Date.now() + LOCATION_CACHE_DURATION,
  })
}

const getLocationApiKey = () => {
  return `${process.env.TARO_APP_TENCENT_MAP_KEY || ''}`.trim()
}

const resolveCityByCoordinates = async (latitude: number, longitude: number) => {
  const mapKey = getLocationApiKey()

  if (!mapKey) {
    return null
  }

  try {
    const res = await Taro.cloud.callFunction({
      name: 'reverseGeocodeLocation',
      data: {
        latitude,
        longitude,
        apiKey: mapKey,
      },
    })

    const result = res.result as any
    if (!result || !result.success || !result.data || !result.data.city) {
      return null
    }

    return {
      city: normalizeCityName(result.data.city || ''),
      province: `${result.data.province || ''}`.trim(),
    }
  } catch (error) {
    console.error('云函数反查地理位置失败', error)
    return null
  }
}

export const getRealLocationInfo = async (fallbackCity = SETTLEMENT_CITY): Promise<RealLocationInfo> => {
  const cachedLocation = getCachedLocation()
  if (cachedLocation) {
    return cachedLocation
  }

  try {
    const locationRes = await Taro.getLocation({
      type: 'gcj02',
    })

    const resolvedLocation = await resolveCityByCoordinates(locationRes.latitude, locationRes.longitude)
    if (resolvedLocation) {
      setCachedLocation(resolvedLocation.city, resolvedLocation.province)
      return {
        ...resolvedLocation,
        source: 'live',
      }
    }
  } catch (error) {
    console.error('获取真实定位失败，已回退默认城市', error)
  }

  return {
    city: normalizeCityName(fallbackCity),
    province: '',
    source: 'fallback',
  }
}
