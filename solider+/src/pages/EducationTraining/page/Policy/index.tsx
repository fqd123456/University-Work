import { Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { TrainingPolicy } from '../../types'
import './index.scss'

type PolicyResult = {
  success?: boolean
  message?: string
  data?: {
    policy?: TrainingPolicy | null
    regionId?: string
    province?: string
    city?: string
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const TrainingPolicyPage = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const regionId = router && router.params && router.params.regionId ? router.params.regionId : ''

  const [policy, setPolicy] = useState<TrainingPolicy | null>(null)
  const [province, setProvince] = useState('江西省')
  const [city, setCity] = useState('抚州市')
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadPolicy = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getEducationTrainingHomeData',
        data: {
          regionId,
        },
      })
      const result = res.result as PolicyResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取培训政策失败')
      }

      setPolicy(result.data.policy || null)
      setProvince(result.data.province || '江西省')
      setCity(result.data.city || '抚州市')
    } catch (error) {
      console.error('加载培训政策失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPolicy()
  }, [regionId])

  const policyTitle = policy ? policy.policyTitle : `${province}退役军人培训支持政策`
  const policySummary = policy
    ? policy.policySummary
    : '符合条件的退役军人可按规定参加免费职业技能培训，并享受培训评价、就业推荐等支持。'
  const highlights = policy && policy.policyHighlights.length
    ? policy.policyHighlights
    : ['免培训费', '技能评价支持', '培训期间服务保障', '推荐就业']
  const supportItems = policy && policy.supportItems.length
    ? policy.supportItems
    : [
      { title: '免培训费', desc: '符合条件的退役军人可按政策申请免费参加职业技能培训。' },
      { title: '推荐就业', desc: '培训后可衔接岗位推荐、就业指导和专项招聘活动。' },
    ]

  return (
    <View className='training-policy-page'>
      {loading && <LightLoading text='正在获取当地培训政策...' />}

      {!loading && errorText && (
        <View className='training-policy-status-card training-policy-status-card-error' onClick={loadPolicy}>
          <Text className='training-policy-status-title'>加载失败</Text>
          <Text className='training-policy-status-desc'>{errorText}</Text>
          <Text className='training-policy-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          <View className='training-policy-header-card'>
            <Text className='training-policy-header-label'>当前地区</Text>
            <Text className='training-policy-header-title'>{province} {city}</Text>
            <Text className='training-policy-header-desc'>以下内容为当前地区培训政策与报名支持说明，可作为报名前的准备参考。</Text>
          </View>

          <View className='training-policy-card'>
            <Text className='training-policy-card-title'>{policyTitle}</Text>
            <Text className='training-policy-card-summary'>{policySummary}</Text>

            <View className='training-policy-chip-list'>
              {highlights.map((item) => (
                <Text key={item} className='training-policy-chip'>{item}</Text>
              ))}
            </View>

            <View className='training-policy-support-list'>
              {supportItems.map((item) => (
                <View key={item.title} className='training-policy-support-item'>
                  <Text className='training-policy-support-title'>{item.title}</Text>
                  <Text className='training-policy-support-desc'>{item.desc}</Text>
                </View>
              ))}
            </View>

            {!!(policy && policy.notice) && (
              <Text className='training-policy-note'>{policy.notice}</Text>
            )}
          </View>
        </>
      )}
    </View>
  )
}

export default TrainingPolicyPage
