import { Image, Swiper, SwiperItem, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { MemorialFacility } from '../../types'
import './index.scss'

type DetailResult = {
  success?: boolean
  message?: string
  data?: {
    detail?: MemorialFacility
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const MemorialFacilityDetail = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const facilityId = router && router.params && router.params.facilityId ? router.params.facilityId : ''

  const [detail, setDetail] = useState<MemorialFacility | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadDetail = async () => {
    if (!facilityId) {
      setLoading(false)
      setErrorText('未找到纪念设施信息')
      return
    }

    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getMemorialFacilityDetail',
        data: {
          facilityId,
        },
      })
      const result = res.result as DetailResult

      if (!result || !result.success || !result.data || !result.data.detail) {
        throw new Error(result && result.message ? result.message : '获取纪念设施详情失败')
      }

      setDetail(result.data.detail)
    } catch (error) {
      console.error('加载纪念设施详情失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [facilityId])

  useEffect(() => {
    if (detail && detail.facilityName) {
      Taro.setNavigationBarTitle({
        title: detail.facilityName,
      })
    }
  }, [detail])

  const handleOpenLocation = () => {
    if (!detail || typeof detail.latitude !== 'number' || typeof detail.longitude !== 'number') {
      Taro.showToast({
        title: '暂未配置导航坐标',
        icon: 'none',
      })
      return
    }

    Taro.openLocation({
      latitude: detail.latitude,
      longitude: detail.longitude,
      name: detail.facilityName,
      address: detail.address,
      scale: 16,
    }).catch((error) => {
      console.error('打开地图失败', error)
      Taro.showToast({
        title: '打开地图失败',
        icon: 'none',
      })
    })
  }

  return (
    <View className='memorial-detail-page'>
      {loading && (
        <LightLoading text='正在获取纪念设施详情...' />
      )}

      {!loading && errorText && (
        <View className='memorial-detail-status-card memorial-detail-status-card-error' onClick={loadDetail}>
          <Text className='memorial-detail-status-title'>加载失败</Text>
          <Text className='memorial-detail-status-desc'>{errorText}</Text>
          <Text className='memorial-detail-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && detail && (
        <>
          <View className='memorial-detail-hero'>
            <Text className='memorial-detail-tag'>{detail.facilityType}</Text>
            <Text className='memorial-detail-title'>{detail.facilityName}</Text>
            <Text className='memorial-detail-meta'>{detail.regionName} · {detail.district}</Text>
            <Text className='memorial-detail-meta'>{detail.openHours}</Text>
          </View>

          <View className='memorial-detail-gallery-card'>
            {detail.imageList && detail.imageList.length ? (
              <Swiper className='memorial-detail-swiper' circular indicatorDots autoplay={false}>
                {detail.imageList.map((item) => (
                  <SwiperItem key={item}>
                    <Image className='memorial-detail-swiper-image' src={item} mode='aspectFill' />
                  </SwiperItem>
                ))}
              </Swiper>
            ) : detail.coverImage ? (
              <Image className='memorial-detail-cover-image' src={detail.coverImage} mode='aspectFill' />
            ) : (
              <View className='memorial-detail-cover-image memorial-detail-cover-fallback'>
                <Text className='memorial-detail-cover-fallback-text'>{detail.facilityType}</Text>
              </View>
            )}
          </View>

          <View className='memorial-detail-base-card'>
            <Text className='memorial-detail-section-title'>设施信息</Text>
            <View className='memorial-detail-info-list'>
              <Text className='memorial-detail-info-item'>具体地址：{detail.address}</Text>
              <Text className='memorial-detail-info-item'>位置说明：{detail.locationLabel}</Text>
              <Text className='memorial-detail-info-item'>开放时间：{detail.openHours}</Text>
            </View>
            <View className='memorial-detail-tag-list'>
              {detail.tags.map((tag) => (
                <Text key={tag} className='memorial-detail-chip'>{tag}</Text>
              ))}
            </View>
            <View className='memorial-detail-nav-btn' onClick={handleOpenLocation}>
              <Text className='memorial-detail-nav-btn-text'>查看位置</Text>
            </View>
          </View>

          <View className='memorial-detail-section'>
            <Text className='memorial-detail-section-title'>设施简介</Text>
            <Text className='memorial-detail-paragraph'>{detail.intro}</Text>
          </View>

          <View className='memorial-detail-section'>
            <Text className='memorial-detail-section-title'>设施沿革</Text>
            <Text className='memorial-detail-paragraph'>{detail.history}</Text>
          </View>
        </>
      )}
    </View>
  )
}

export default MemorialFacilityDetail
