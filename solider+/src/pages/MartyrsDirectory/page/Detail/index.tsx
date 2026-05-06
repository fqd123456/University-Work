import { Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { MartyrRecord } from '../../types'
import './index.scss'

type DetailResult = {
  success?: boolean
  message?: string
  data?: {
    detail?: MartyrRecord
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const MartyrDirectoryDetail = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const martyrId = router && router.params && router.params.martyrId ? router.params.martyrId : ''

  const [detail, setDetail] = useState<MartyrRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadDetail = async () => {
    if (!martyrId) {
      setLoading(false)
      setErrorText('未找到烈士信息')
      return
    }

    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getMartyrDirectoryDetail',
        data: {
          martyrId,
        },
      })
      const result = res.result as DetailResult

      if (!result || !result.success || !result.data || !result.data.detail) {
        throw new Error(result && result.message ? result.message : '获取烈士详情失败')
      }

      setDetail(result.data.detail)
    } catch (error) {
      console.error('加载烈士详情失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [martyrId])

  useEffect(() => {
    if (detail && detail.name) {
      Taro.setNavigationBarTitle({
        title: detail.name,
      })
    }
  }, [detail])

  return (
    <View className='martyr-detail-page'>
      {loading && (
        <LightLoading text='正在获取烈士详情...' />
      )}

      {!loading && errorText && (
        <View className='martyr-detail-status-card martyr-detail-status-card-error' onClick={loadDetail}>
          <Text className='martyr-detail-status-title'>加载失败</Text>
          <Text className='martyr-detail-status-desc'>{errorText}</Text>
          <Text className='martyr-detail-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && detail && (
        <>
          <View className='martyr-detail-hero'>
            <Text className='martyr-detail-tag'>烈士英名录</Text>
            <Text className='martyr-detail-title'>{detail.name}</Text>
            <Text className='martyr-detail-meta'>{detail.lifespan}</Text>
            <Text className='martyr-detail-desc'>{detail.regionName} · {detail.district}</Text>
          </View>

          <View className='martyr-detail-base-card'>
            <Text className='martyr-detail-section-title'>基本信息</Text>
            <View className='martyr-detail-info-list'>
              <Text className='martyr-detail-info-item'>籍贯地址：{detail.address}</Text>
              <Text className='martyr-detail-info-item'>所属单位：{detail.serviceUnit}</Text>
              <Text className='martyr-detail-info-item'>生前职务：{detail.position}</Text>
              <Text className='martyr-detail-info-item'>牺牲地点：{detail.sacrificePlace}</Text>
              <Text className='martyr-detail-info-item'>纪念地点：{detail.memorialSite}</Text>
            </View>
            <View className='martyr-detail-tag-list'>
              {detail.tags.map((tag) => (
                <Text key={tag} className='martyr-detail-chip'>{tag}</Text>
              ))}
            </View>
          </View>

          <View className='martyr-detail-section'>
            <Text className='martyr-detail-section-title'>生前情况</Text>
            <Text className='martyr-detail-paragraph'>{detail.lifeStory}</Text>
          </View>

          <View className='martyr-detail-section'>
            <Text className='martyr-detail-section-title'>牺牲情况</Text>
            <Text className='martyr-detail-paragraph'>{detail.sacrificeSituation}</Text>
          </View>

          <View className='martyr-detail-section'>
            <Text className='martyr-detail-section-title'>烈士事迹</Text>
            <Text className='martyr-detail-paragraph'>{detail.heroicStory}</Text>
          </View>
        </>
      )}
    </View>
  )
}

export default MartyrDirectoryDetail
