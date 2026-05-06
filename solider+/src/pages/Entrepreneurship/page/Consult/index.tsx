import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { EntrepreneurshipHomeData, RegionalEntrepreneurshipOffice } from '../../types'
import './index.scss'

const DEFAULT_REGION_ID = 'jx_fuzhou'

type HomeResult = {
  success?: boolean
  message?: string
  data?: EntrepreneurshipHomeData
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const EntrepreneurshipConsultPage = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const regionId = router && router.params && router.params.regionId ? router.params.regionId : DEFAULT_REGION_ID

  const [regionName, setRegionName] = useState('当前地区')
  const [office, setOffice] = useState<RegionalEntrepreneurshipOffice | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadData = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getEntrepreneurshipData',
        data: { regionId },
      })
      const result = res.result as HomeResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取数据失败')
      }

      setRegionName(result.data.regionName)
      setOffice(result.data.office || null)
    } catch (error) {
      console.error('加载创业咨询失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [regionId])

  const navigateToOfficeDetail = () => {
    if (!office) return
    Taro.navigateTo({
      url: `/pages/Entrepreneurship/page/SupportDetail/index?type=office&regionId=${regionId}`,
    })
  }

  const goToAI = () => {
    Taro.switchTab({ url: '/pages/AI/index' })
  }

  return (
    <View className='entrepreneurship-consult-page'>
      <View className='entrepreneurship-consult-header'>
        <Text className='entrepreneurship-consult-title'>创业咨询</Text>
        <Text className='entrepreneurship-consult-desc'>{regionName}创业咨询与窗口服务</Text>
      </View>

      {loading && <LightLoading text='正在获取创业咨询信息...' />}

      {!loading && errorText && (
        <View className='entrepreneurship-consult-status' onClick={loadData}>
          <Text className='entrepreneurship-consult-status-title'>加载失败</Text>
          <Text className='entrepreneurship-consult-status-desc'>{errorText}</Text>
          <Text className='entrepreneurship-consult-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          {office ? (
            <View className='entrepreneurship-consult-card entrepreneurship-consult-card-office' onClick={navigateToOfficeDetail}>
              <Text className='entrepreneurship-consult-card-tag'>创业办公室</Text>
              <Text className='entrepreneurship-consult-card-title'>{office.officeName}</Text>
              <Text className='entrepreneurship-consult-card-desc'>{office.contactName} · {office.contactPhone}</Text>
              <Text className='entrepreneurship-consult-card-desc'>{office.officeHours}</Text>
              <Text className='entrepreneurship-consult-card-desc'>{office.address}</Text>
              <Text className='entrepreneurship-consult-card-link'>查看窗口详情</Text>
            </View>
          ) : (
            <View className='entrepreneurship-consult-status'>
              <Text className='entrepreneurship-consult-status-title'>当前地区还未配置创业办公室</Text>
              <Text className='entrepreneurship-consult-status-desc'>可以先在云数据库中补充地区办公室信息。</Text>
            </View>
          )}

          <View className='entrepreneurship-consult-card entrepreneurship-consult-card-ai' onClick={goToAI}>
            <Text className='entrepreneurship-consult-card-tag'>AI 创业咨询</Text>
            <Text className='entrepreneurship-consult-card-title'>政策、补贴、贷款与创业路径辅助解答</Text>
            <Text className='entrepreneurship-consult-card-desc'>可继续咨询创业扶持政策、补贴申报、窗口办理准备材料和常见创业问题。</Text>
            <Text className='entrepreneurship-consult-card-link'>前往 AI 咨询</Text>
          </View>
        </>
      )}
    </View>
  )
}

export default EntrepreneurshipConsultPage
