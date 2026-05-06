import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../components/LightLoading'
import { ensureLoggedIn } from '../../utils/auth'
import { EntrepreneurshipCompany, EntrepreneurshipHomeData } from './types'
import './index.scss'

const DEFAULT_REGION_ID = 'jx_fuzhou'

const initialHomeData: EntrepreneurshipHomeData = {
  regionId: DEFAULT_REGION_ID,
  regionName: '当前地区',
  mentorCompanies: [],
  office: null,
  overview: {
    mentorCompanyCount: 0,
    featuredCompanyCount: 0,
    hasOffice: false,
  },
}

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

const Entrepreneurship = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const regionId = router && router.params && router.params.regionId ? router.params.regionId : DEFAULT_REGION_ID

  const [pageData, setPageData] = useState<EntrepreneurshipHomeData>(initialHomeData)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [authorized, setAuthorized] = useState(false)

  const loadPageData = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getEntrepreneurshipData',
        data: { regionId },
      })
      const result = res.result as HomeResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取创业扶持数据失败')
      }

      setPageData(result.data)
    } catch (error) {
      console.error('加载创业扶持数据失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    const passed = ensureLoggedIn({ redirect: true })
    setAuthorized(passed)

    if (!passed) {
      setPageData(initialHomeData)
      setLoading(false)
      setErrorText('')
    }
  })

  useEffect(() => {
    if (!authorized) {
      return
    }

    void loadPageData()
  }, [authorized, regionId])

  const navigateToCompanyDetail = (company: EntrepreneurshipCompany) => {
    Taro.navigateTo({
      url: `/pages/Entrepreneurship/page/SupportDetail/index?type=company&companyId=${company._id || ''}&regionId=${pageData.regionId}`,
    })
  }

  if (!authorized) {
    return <View className='entrepreneurship-page' />
  }

  return (
    <View className='entrepreneurship-page'>
      <View className='entrepreneurship-hero'>
        <View className='entrepreneurship-hero-region'>
          <Text className='entrepreneurship-hero-region-label'>当前地区</Text>
          <Text className='entrepreneurship-hero-region-value'>{pageData.regionName}</Text>
        </View>
      </View>

      {loading && (
        <LightLoading text='正在获取创业企业与咨询服务信息...' />
      )}

      {!loading && errorText && (
        <View className='entrepreneurship-status-card entrepreneurship-status-card-error' onClick={loadPageData}>
          <Text className='entrepreneurship-status-title'>加载失败</Text>
          <Text className='entrepreneurship-status-desc'>{errorText}</Text>
          <Text className='entrepreneurship-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          <View className='entrepreneurship-module-grid'>
            <View
              className='entrepreneurship-module-card entrepreneurship-module-card-primary'
              onClick={() => Taro.navigateTo({ url: `/pages/Entrepreneurship/page/Mentor/index?regionId=${pageData.regionId}` })}
            >
              <Text className='entrepreneurship-module-title'>优创传帮带</Text>
              <Text className='entrepreneurship-module-desc'>优秀军创企业经验展示、创业陪跑和传帮带交流。</Text>
              <Text className='entrepreneurship-module-metric'>进入查看</Text>
            </View>
            <View
              className='entrepreneurship-module-card entrepreneurship-module-card-secondary'
              onClick={() => Taro.navigateTo({ url: `/pages/Entrepreneurship/page/Consult/index?regionId=${pageData.regionId}` })}
            >
              <Text className='entrepreneurship-module-title'>创业咨询</Text>
              <Text className='entrepreneurship-module-desc'>本地创业办公室窗口服务 + AI 创业政策辅助咨询。</Text>
              <Text className='entrepreneurship-module-metric'>进入查看</Text>
            </View>
          </View>

          <View className='entrepreneurship-section'>
            <View className='entrepreneurship-section-header'>
              <View>
                <Text className='entrepreneurship-section-title'>优秀创业案例</Text>
                <Text className='entrepreneurship-section-subtitle'>精选两个优秀退役军人创业案例</Text>
              </View>
              <Text className='entrepreneurship-section-count'>{Math.min((pageData.mentorCompanies || []).length, 2)} 个案例</Text>
            </View>

            <View className='entrepreneurship-company-list'>
              {(pageData.mentorCompanies || []).slice(0, 2).map((company) => (
                <View
                  key={company._id || company.companyName}
                  className='entrepreneurship-company-card'
                  onClick={() => navigateToCompanyDetail(company)}
                >
                  <View className='entrepreneurship-company-top'>
                    <View className='entrepreneurship-company-main'>
                      <Text className='entrepreneurship-company-name'>{company.companyName}</Text>
                      <Text className='entrepreneurship-company-founder'>{company.founderName} · {company.founderTitle}</Text>
                    </View>
                    <Text className='entrepreneurship-company-industry'>{company.industry}</Text>
                  </View>

                  <Text className='entrepreneurship-company-intro'>{company.intro}</Text>

                  <View className='entrepreneurship-chip-list'>
                    {company.tags.map((tag) => (
                      <Text key={`${company._id || company.companyName}-${tag}`} className='entrepreneurship-chip'>
                        {tag}
                      </Text>
                    ))}
                  </View>

                  <View className='entrepreneurship-company-foot'>
                    <Text className='entrepreneurship-company-foot-text'>启动投入 {company.initialInvestment}</Text>
                    <Text className='entrepreneurship-company-link'>查看详情</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  )
}

export default Entrepreneurship
