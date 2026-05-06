import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { EntrepreneurshipCompany, EntrepreneurshipHomeData } from '../../types'
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

const EntrepreneurshipMentorPage = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const regionId = router && router.params && router.params.regionId ? router.params.regionId : DEFAULT_REGION_ID

  const [regionName, setRegionName] = useState('当前地区')
  const [companyList, setCompanyList] = useState<EntrepreneurshipCompany[]>([])
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
      setCompanyList(result.data.mentorCompanies || [])
    } catch (error) {
      console.error('加载优创传帮带失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [regionId])

  const navigateToCompanyDetail = (company: EntrepreneurshipCompany) => {
    Taro.navigateTo({
      url: `/pages/Entrepreneurship/page/SupportDetail/index?type=company&companyId=${company._id || ''}&regionId=${regionId}`,
    })
  }

  return (
    <View className='entrepreneurship-mentor-page'>
      <View className='entrepreneurship-mentor-header'>
        <Text className='entrepreneurship-mentor-title'>优创传帮带</Text>
        <Text className='entrepreneurship-mentor-desc'>{regionName}优秀退役军人创业企业展示</Text>
      </View>

      {loading && <LightLoading text='正在获取军创企业信息...' />}

      {!loading && errorText && (
        <View className='entrepreneurship-mentor-status' onClick={loadData}>
          <Text className='entrepreneurship-mentor-status-title'>加载失败</Text>
          <Text className='entrepreneurship-mentor-status-desc'>{errorText}</Text>
          <Text className='entrepreneurship-mentor-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <View className='entrepreneurship-mentor-list'>
          {companyList.map((company) => (
            <View
              key={company._id || company.companyName}
              className='entrepreneurship-mentor-card'
              onClick={() => navigateToCompanyDetail(company)}
            >
              <View className='entrepreneurship-mentor-card-top'>
                <View className='entrepreneurship-mentor-card-main'>
                  <Text className='entrepreneurship-mentor-card-title'>{company.companyName}</Text>
                  <Text className='entrepreneurship-mentor-card-subtitle'>{company.founderName} · {company.founderTitle}</Text>
                </View>
                <Text className='entrepreneurship-mentor-card-tag'>{company.industry}</Text>
              </View>
              <Text className='entrepreneurship-mentor-card-desc'>{company.intro}</Text>
              <View className='entrepreneurship-mentor-chip-list'>
                {company.tags.map((tag) => (
                  <Text key={`${company._id || company.companyName}-${tag}`} className='entrepreneurship-mentor-chip'>{tag}</Text>
                ))}
              </View>
              <View className='entrepreneurship-mentor-card-foot'>
                <Text className='entrepreneurship-mentor-card-foot-text'>启动投入 {company.initialInvestment}</Text>
                <Text className='entrepreneurship-mentor-card-link'>查看详情</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default EntrepreneurshipMentorPage
