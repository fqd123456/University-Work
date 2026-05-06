import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { EntrepreneurshipCompany, RegionalEntrepreneurshipOffice } from '../../types'
import './index.scss'

const DEFAULT_REGION_ID = 'jx_fuzhou'

type DetailType = 'company' | 'office'

type DetailResult = {
  success?: boolean
  message?: string
  data?: {
    type?: DetailType
    detail?: EntrepreneurshipCompany | RegionalEntrepreneurshipOffice | null
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const EntrepreneurshipSupportDetail = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const type = router && router.params && (router.params.type === 'company' || router.params.type === 'office')
    ? router.params.type
    : 'company'
  const companyId = router && router.params && router.params.companyId ? router.params.companyId : ''
  const regionId = router && router.params && router.params.regionId ? router.params.regionId : DEFAULT_REGION_ID

  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [companyDetail, setCompanyDetail] = useState<EntrepreneurshipCompany | null>(null)
  const [officeDetail, setOfficeDetail] = useState<RegionalEntrepreneurshipOffice | null>(null)

  useEffect(() => {
    Taro.setNavigationBarTitle({
      title: type === 'company' ? '企业详情' : '创业咨询',
    })
  }, [type])

  const loadDetail = async () => {
    setLoading(true)
    setErrorText('')
    setCompanyDetail(null)
    setOfficeDetail(null)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getEntrepreneurshipDetail',
        data: {
          type,
          companyId,
          regionId,
        },
      })

      const result = res.result as DetailResult

      if (!result || !result.success || !result.data || !result.data.detail) {
        throw new Error(result && result.message ? result.message : '获取详情失败')
      }

      if (type === 'company') {
        setCompanyDetail(result.data.detail as EntrepreneurshipCompany)
      } else {
        setOfficeDetail(result.data.detail as RegionalEntrepreneurshipOffice)
      }
    } catch (error) {
      console.error('加载创业扶持详情失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [type, companyId, regionId])

  const handleCall = (phone: string) => {
    if (!phone) {
      return
    }

    Taro.makePhoneCall({
      phoneNumber: phone,
    }).catch((error) => {
      console.error('拨号失败', error)
      Taro.showToast({
        title: '拨号失败',
        icon: 'none',
      })
    })
  }

  const handleOpenLocation = (latitude?: number, longitude?: number, name?: string, address?: string) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      Taro.showToast({
        title: '暂未配置地图坐标',
        icon: 'none',
      })
      return
    }

    Taro.openLocation({
      latitude,
      longitude,
      name,
      address,
      scale: 16,
    }).catch((error) => {
      console.error('打开地图失败', error)
      Taro.showToast({
        title: '打开地图失败',
        icon: 'none',
      })
    })
  }

  const goToAI = () => {
    Taro.switchTab({ url: '/pages/AI/index' })
  }

  return (
    <View className='entrepreneurship-detail-page'>
      {loading && (
        <LightLoading text='正在获取详细信息...' />
      )}

      {!loading && errorText && (
        <View className='entrepreneurship-detail-status-card entrepreneurship-detail-status-card-error' onClick={loadDetail}>
          <Text className='entrepreneurship-detail-status-title'>加载失败</Text>
          <Text className='entrepreneurship-detail-status-desc'>{errorText}</Text>
          <Text className='entrepreneurship-detail-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && companyDetail && (
        <>
          <View className='entrepreneurship-detail-hero'>
            <Text className='entrepreneurship-detail-tag'>优创传帮带</Text>
            <Text className='entrepreneurship-detail-title'>{companyDetail.companyName}</Text>
            <Text className='entrepreneurship-detail-desc'>{companyDetail.founderName} · {companyDetail.founderTitle}</Text>
            <Text className='entrepreneurship-detail-desc'>{companyDetail.industry} · 成立于 {companyDetail.establishedAt}</Text>
          </View>

          <View className='entrepreneurship-detail-section'>
            <Text className='entrepreneurship-detail-section-title'>联系信息</Text>
            <View className='entrepreneurship-detail-info-list'>
              <Text className='entrepreneurship-detail-info-item'>联系人：{companyDetail.contactName}</Text>
              <Text className='entrepreneurship-detail-info-item'>联系电话：{companyDetail.contactPhone}</Text>
              <Text className='entrepreneurship-detail-info-item'>联系地址：{companyDetail.address}</Text>
            </View>
            <View className='entrepreneurship-detail-action-row'>
              <View className='entrepreneurship-detail-btn entrepreneurship-detail-btn-primary' onClick={() => handleCall(companyDetail.contactPhone)}>
                <Text className='entrepreneurship-detail-btn-text entrepreneurship-detail-btn-text-primary'>拨打电话</Text>
              </View>
              <View
                className='entrepreneurship-detail-btn entrepreneurship-detail-btn-secondary'
                onClick={() => handleOpenLocation(companyDetail.latitude, companyDetail.longitude, companyDetail.companyName, companyDetail.address)}
              >
                <Text className='entrepreneurship-detail-btn-text entrepreneurship-detail-btn-text-secondary'>查看位置</Text>
              </View>
            </View>
          </View>

          <View className='entrepreneurship-detail-metric-grid'>
            <View className='entrepreneurship-detail-metric-card'>
              <Text className='entrepreneurship-detail-metric-label'>资金投入</Text>
              <Text className='entrepreneurship-detail-metric-value'>{companyDetail.initialInvestment}</Text>
            </View>
            <View className='entrepreneurship-detail-metric-card'>
              <Text className='entrepreneurship-detail-metric-label'>当前阶段</Text>
              <Text className='entrepreneurship-detail-metric-value'>{companyDetail.currentStage}</Text>
            </View>
            <View className='entrepreneurship-detail-metric-card'>
              <Text className='entrepreneurship-detail-metric-label'>团队规模</Text>
              <Text className='entrepreneurship-detail-metric-value'>{companyDetail.teamSize}</Text>
            </View>
            <View className='entrepreneurship-detail-metric-card'>
              <Text className='entrepreneurship-detail-metric-label'>营收情况</Text>
              <Text className='entrepreneurship-detail-metric-value'>{companyDetail.annualRevenue}</Text>
            </View>
          </View>

          <View className='entrepreneurship-detail-section'>
            <Text className='entrepreneurship-detail-section-title'>企业介绍</Text>
            <Text className='entrepreneurship-detail-paragraph'>{companyDetail.intro}</Text>
          </View>

          <View className='entrepreneurship-detail-section'>
            <Text className='entrepreneurship-detail-section-title'>传帮带方向</Text>
            <Text className='entrepreneurship-detail-paragraph'>{companyDetail.mentorshipDirection}</Text>
            <View className='entrepreneurship-detail-chip-list'>
              {companyDetail.supportHighlights.map((item) => (
                <Text key={item} className='entrepreneurship-detail-chip'>{item}</Text>
              ))}
            </View>
          </View>

          <View className='entrepreneurship-detail-section'>
            <Text className='entrepreneurship-detail-section-title'>后续规划</Text>
            <Text className='entrepreneurship-detail-paragraph'>{companyDetail.futurePlan}</Text>
          </View>
        </>
      )}

      {!loading && !errorText && officeDetail && (
        <>
          <View className='entrepreneurship-detail-hero'>
            <Text className='entrepreneurship-detail-tag'>创业咨询</Text>
            <Text className='entrepreneurship-detail-title'>{officeDetail.officeName}</Text>
            <Text className='entrepreneurship-detail-desc'>{officeDetail.regionName}</Text>
            <Text className='entrepreneurship-detail-desc'>{officeDetail.officeHours}</Text>
          </View>

          <View className='entrepreneurship-detail-section'>
            <Text className='entrepreneurship-detail-section-title'>窗口信息</Text>
            <View className='entrepreneurship-detail-info-list'>
              <Text className='entrepreneurship-detail-info-item'>联系人：{officeDetail.contactName}</Text>
              <Text className='entrepreneurship-detail-info-item'>联系电话：{officeDetail.contactPhone}</Text>
              <Text className='entrepreneurship-detail-info-item'>办公时间：{officeDetail.officeHours}</Text>
              <Text className='entrepreneurship-detail-info-item'>办公地址：{officeDetail.address}</Text>
            </View>
            <View className='entrepreneurship-detail-action-row'>
              <View className='entrepreneurship-detail-btn entrepreneurship-detail-btn-primary' onClick={() => handleCall(officeDetail.contactPhone)}>
                <Text className='entrepreneurship-detail-btn-text entrepreneurship-detail-btn-text-primary'>拨打电话</Text>
              </View>
              <View
                className='entrepreneurship-detail-btn entrepreneurship-detail-btn-secondary'
                onClick={() => handleOpenLocation(officeDetail.latitude, officeDetail.longitude, officeDetail.officeName, officeDetail.address)}
              >
                <Text className='entrepreneurship-detail-btn-text entrepreneurship-detail-btn-text-secondary'>查看位置</Text>
              </View>
            </View>
          </View>

          <View className='entrepreneurship-detail-section'>
            <Text className='entrepreneurship-detail-section-title'>服务范围</Text>
            <View className='entrepreneurship-detail-list'>
              {officeDetail.serviceScope.map((item) => (
                <Text key={item} className='entrepreneurship-detail-list-item'>{item}</Text>
              ))}
            </View>
          </View>

          <View className='entrepreneurship-detail-section'>
            <Text className='entrepreneurship-detail-section-title'>建议携带材料</Text>
            <View className='entrepreneurship-detail-list'>
              {officeDetail.materials.map((item) => (
                <Text key={item} className='entrepreneurship-detail-list-item'>{item}</Text>
              ))}
            </View>
          </View>

          <View className='entrepreneurship-detail-section'>
            <Text className='entrepreneurship-detail-section-title'>政策咨询提示</Text>
            <View className='entrepreneurship-detail-list'>
              {officeDetail.policyTips.map((item) => (
                <Text key={item} className='entrepreneurship-detail-list-item'>{item}</Text>
              ))}
            </View>
          </View>

          <View className='entrepreneurship-detail-section entrepreneurship-detail-ai-card' onClick={goToAI}>
            <Text className='entrepreneurship-detail-section-title'>AI 创业政策咨询</Text>
            <Text className='entrepreneurship-detail-paragraph'>
              如果你想进一步咨询创业扶持政策、补贴、贷款、创业计划书准备等问题，可以直接进入 AI 咨询页面。
            </Text>
            <Text className='entrepreneurship-detail-ai-link'>前往 AI 咨询</Text>
          </View>
        </>
      )}
    </View>
  )
}

export default EntrepreneurshipSupportDetail
