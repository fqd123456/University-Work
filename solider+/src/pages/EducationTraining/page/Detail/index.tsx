import { Text, View } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { TrainingProgram, TrainingProvider, TrainingRegistration } from '../../types'
import './index.scss'

type DetailResult = {
  success?: boolean
  message?: string
  data?: {
    detail?: TrainingProgram | null
    provider?: TrainingProvider | null
    registration?: TrainingRegistration | null
  }
}

type RegisterResult = {
  success?: boolean
  message?: string
  data?: TrainingRegistration
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const stageClassMap = {
  审核中: 'training-detail-stage-pending',
  待开班: 'training-detail-stage-upcoming',
  培训中: 'training-detail-stage-running',
  已结业: 'training-detail-stage-done',
  未通过: 'training-detail-stage-rejected',
}

const TrainingProgramDetail = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const programId = router && router.params && router.params.programId ? router.params.programId : ''

  const [detail, setDetail] = useState<TrainingProgram | null>(null)
  const [provider, setProvider] = useState<TrainingProvider | null>(null)
  const [registration, setRegistration] = useState<TrainingRegistration | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [registering, setRegistering] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const approveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const registrationId = registration && registration._id ? registration._id : ''
  const registrationStage = registration ? registration.stage : ''

  const clearApproveTimer = () => {
    if (approveTimerRef.current) {
      clearTimeout(approveTimerRef.current)
      approveTimerRef.current = null
    }
  }

  const loadDetail = async () => {
    if (!programId) {
      setLoading(false)
      setErrorText('未找到培训课程')
      return
    }

    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getTrainingProgramDetail',
        data: {
          programId,
        },
      })
      const result = res.result as DetailResult

      if (!result || !result.success || !result.data || !result.data.detail) {
        throw new Error(result && result.message ? result.message : '获取培训详情失败')
      }

      setDetail(result.data.detail)
      setProvider(result.data.provider || null)
      setRegistration(result.data.registration || null)
    } catch (error) {
      console.error('加载培训详情失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [programId])

  useEffect(() => {
    if (detail && detail.title) {
      Taro.setNavigationBarTitle({
        title: detail.title,
      })
    }
  }, [detail])

  useEffect(() => {
    return () => {
      clearApproveTimer()
    }
  }, [])

  useEffect(() => {
    clearApproveTimer()

    if (!registration || registrationStage !== '审核中' || !registrationId) {
      return
    }

    approveTimerRef.current = setTimeout(() => {
      void advanceRegistrationStage(registrationId)
    }, 3000)
  }, [registration, registrationId, registrationStage])

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

  const handleOpenLocation = () => {
    const latitude = provider && typeof provider.latitude === 'number' ? provider.latitude : undefined
    const longitude = provider && typeof provider.longitude === 'number' ? provider.longitude : undefined

    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !detail) {
      Taro.showToast({
        title: '暂未配置地图坐标',
        icon: 'none',
      })
      return
    }

    Taro.openLocation({
      latitude,
      longitude,
      name: detail.providerName,
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

  const goToStatus = () => {
    if (!detail) {
      return
    }

    Taro.navigateTo({
      url: `/pages/EducationTraining/page/Status/index?regionId=${detail.regionId}`,
    })
  }

  const advanceRegistrationStage = async (registrationId: string) => {
    try {
      const res = await Taro.cloud.callFunction({
        name: 'advanceTrainingRegistrationStage',
        data: {
          registrationId,
        },
      })
      const result = res.result as RegisterResult

      if (!result || !result.success) {
        return
      }

      if (result.data) {
        setRegistration(result.data)
      } else {
        await loadDetail()
      }
    } catch (error) {
      console.error('更新培训报名阶段失败', error)
    }
  }

  const handleRegister = async () => {
    if (!detail) {
      return
    }

    if (registration) {
      goToStatus()
      return
    }

    if (detail.programStatus !== '报名中') {
      Taro.showToast({
        title: '当前课程暂不可报名',
        icon: 'none',
      })
      return
    }

    setRegistering(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'createTrainingRegistration',
        data: {
          programId: detail._id,
        },
      })
      const result = res.result as RegisterResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '报名失败')
      }

      Taro.showToast({
        title: '报名已提交',
        icon: 'success',
      })
      if (result.data) {
        setRegistration(result.data)
      }
      await loadDetail()
    } catch (error) {
      console.error('提交培训报名失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setRegistering(false)
    }
  }

  const handleCancel = async () => {
    if (!registration || !registration._id || canceling) {
      return
    }

    setCanceling(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'cancelTrainingRegistration',
        data: {
          registrationId: registration._id,
          programId: detail && detail._id ? detail._id : '',
        },
      })
      const result = res.result as RegisterResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '退选失败')
      }

      clearApproveTimer()
      Taro.showToast({
        title: '已退选',
        icon: 'success',
      })
      setRegistration(null)
      await loadDetail()
    } catch (error) {
      console.error('退选培训失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setCanceling(false)
    }
  }

  const getActionText = () => {
    if (registering) {
      return '提交中...'
    }

    if (registration) {
      return `查看培训状态 · ${registration.stage}`
    }

    if (detail && detail.programStatus !== '报名中') {
      return '当前暂不可报名'
    }

    return '立即报名'
  }

  const canCancel = !!(registration && (registration.stage === '审核中' || registration.stage === '待开班'))

  return (
    <View className='training-detail-page'>
      {loading && (
        <LightLoading text='正在获取培训详情...' />
      )}

      {!loading && errorText && (
        <View className='training-detail-status-card training-detail-status-card-error' onClick={loadDetail}>
          <Text className='training-detail-status-title'>加载失败</Text>
          <Text className='training-detail-status-desc'>{errorText}</Text>
          <Text className='training-detail-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && detail && (
        <>
          <View className='training-detail-hero'>
            <Text className='training-detail-tag'>{detail.category}</Text>
            <Text className='training-detail-title'>{detail.title}</Text>
            <Text className='training-detail-meta'>{detail.providerName}</Text>
            <Text className='training-detail-meta'>{detail.regionName} · {detail.programStatus}</Text>
          </View>

          {registration && (
            <View className='training-detail-registration-card'>
              <View className='training-detail-registration-head'>
                <Text className='training-detail-section-title'>当前报名状态</Text>
                <Text className={`training-detail-stage ${stageClassMap[registration.stage]}`}>
                  {registration.stage}
                </Text>
              </View>
              <Text className='training-detail-info-item'>报名时间：{registration.registeredAt}</Text>
              <Text className='training-detail-info-item'>{registration.auditNote}</Text>
              {canCancel && (
                <View className='training-detail-registration-action' onClick={() => { void handleCancel() }}>
                  <Text className='training-detail-registration-action-text'>{canceling ? '退选中...' : '退选'}</Text>
                </View>
              )}
            </View>
          )}

          <View className='training-detail-section'>
            <Text className='training-detail-section-title'>培训基础信息</Text>
            <View className='training-detail-info-list'>
              <Text className='training-detail-info-item'>培训机构：{detail.providerName}</Text>
              <Text className='training-detail-info-item'>具体位置：{detail.address}</Text>
              <Text className='training-detail-info-item'>培训人数：{detail.enrolledCount} / {detail.capacity}</Text>
              <Text className='training-detail-info-item'>培训时间：{detail.trainingStartAt} 至 {detail.trainingEndAt}</Text>
              <Text className='training-detail-info-item'>报名时间：{detail.registrationStartAt} 至 {detail.registrationEndAt}</Text>
              <Text className='training-detail-info-item'>审核机构：{detail.approvalAgency}</Text>
            </View>
          </View>

          <View className='training-detail-section'>
            <Text className='training-detail-section-title'>培训岗位</Text>
            <View className='training-detail-chip-list'>
              {detail.positions.map((item) => (
                <Text key={item} className='training-detail-chip'>{item}</Text>
              ))}
            </View>
          </View>

          <View className='training-detail-section'>
            <Text className='training-detail-section-title'>联系信息</Text>
            <View className='training-detail-info-list'>
              <Text className='training-detail-info-item'>联系人：{detail.contactName}</Text>
              <Text className='training-detail-info-item'>联系电话：{detail.contactPhone}</Text>
              <Text className='training-detail-info-item'>机构类型：{provider ? provider.providerType : '培训承办机构'}</Text>
            </View>

            <View className='training-detail-action-row'>
              <View className='training-detail-btn training-detail-btn-primary' onClick={() => handleCall(detail.contactPhone)}>
                <Text className='training-detail-btn-text training-detail-btn-text-primary'>拨打电话</Text>
              </View>
              <View className='training-detail-btn training-detail-btn-secondary' onClick={handleOpenLocation}>
                <Text className='training-detail-btn-text training-detail-btn-text-secondary'>查看位置</Text>
              </View>
            </View>
          </View>

          <View className='training-detail-section'>
            <Text className='training-detail-section-title'>证书信息</Text>
            <View className='training-detail-info-list'>
              <Text className='training-detail-info-item'>是否取得证书：{detail.certificateAvailable ? '是' : '否'}</Text>
              <Text className='training-detail-info-item'>证书名称：{detail.certificateName || '无'}</Text>
              <Text className='training-detail-info-item'>证书等级：{detail.certificateLevel || '无'}</Text>
            </View>
          </View>

          <View className='training-detail-section'>
            <Text className='training-detail-section-title'>培训目的</Text>
            <Text className='training-detail-paragraph'>{detail.trainingGoal}</Text>
          </View>

          <View className='training-detail-section'>
            <Text className='training-detail-section-title'>培训内容</Text>
            <Text className='training-detail-paragraph'>{detail.trainingContent}</Text>
          </View>

          <View className='training-detail-section'>
            <Text className='training-detail-section-title'>考核标准</Text>
            <Text className='training-detail-paragraph'>{detail.assessmentStandard}</Text>
          </View>

          {provider && (
            <View className='training-detail-section'>
              <Text className='training-detail-section-title'>机构介绍</Text>
              <Text className='training-detail-paragraph'>{provider.intro}</Text>
              <View className='training-detail-chip-list'>
                {provider.specialties.map((item) => (
                  <Text key={item} className='training-detail-chip'>{item}</Text>
                ))}
              </View>
            </View>
          )}

          <View className='training-detail-footer-space' />
          <View className='training-detail-footer'>
            <View className='training-detail-footer-actions'>
              {canCancel && (
                <View
                  className='training-detail-footer-btn training-detail-footer-btn-secondary training-detail-footer-btn-cancel'
                  onClick={() => { void handleCancel() }}
                >
                  <Text className='training-detail-footer-btn-text training-detail-footer-btn-text-secondary'>
                    {canceling ? '退选中...' : '退选'}
                  </Text>
                </View>
              )}
              <View
                className={[
                  'training-detail-footer-btn',
                  registration || detail.programStatus !== '报名中' || registering
                    ? 'training-detail-footer-btn-secondary'
                    : 'training-detail-footer-btn-primary',
                ].join(' ')}
                onClick={handleRegister}
              >
                <Text
                  className={[
                    'training-detail-footer-btn-text',
                    registration || detail.programStatus !== '报名中' || registering
                      ? 'training-detail-footer-btn-text-secondary'
                      : 'training-detail-footer-btn-text-primary',
                  ].join(' ')}
                >
                  {getActionText()}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  )
}

export default TrainingProgramDetail
