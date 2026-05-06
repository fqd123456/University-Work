import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

type AuthForm = {
  realName: string
  placementRegion: string
  phone: string
  idNumber: string
  note: string
}

const emptyForm: AuthForm = {
  realName: '',
  placementRegion: '',
  phone: '',
  idNumber: '',
  note: '',
}

const normalizeUserInfo = (rawUser: any) => {
  if (!rawUser) return null
  const source = rawUser.data ? rawUser.data : rawUser

  return {
    realName: source.real_name || source.realName || '',
    placementRegion: source.veteran_placement_region || source.placement_region || source.service_region || source.serviceRegion || '',
    phone: source.phone || '',
    idNumber: source.veteran_id_number || '',
    note: source.veteran_auth_note || '',
    auditStatus: source.audit_status || source.auditStatus || '',
  }
}

const getAuditStatusText = (status: string, dirty: boolean) => {
  const value = `${status || ''}`.toLowerCase()

  if (dirty) {
    return '需重新认证'
  }

  if (value === 'approved' || value === 'success') {
    return '认证成功'
  }

  if (value === 'pending' || value === 'processing') {
    return '审核中'
  }

  return '未认证'
}

const VeteranAuth = () => {
  const [form, setForm] = useState<AuthForm>(emptyForm)
  const [initialForm, setInitialForm] = useState<AuthForm>(emptyForm)
  const [auditStatus, setAuditStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [phoneBinding, setPhoneBinding] = useState(false)

  const hasChanged = useMemo(() => (
    form.realName !== initialForm.realName
    || form.placementRegion !== initialForm.placementRegion
    || form.phone !== initialForm.phone
    || form.idNumber !== initialForm.idNumber
    || form.note !== initialForm.note
  ), [form, initialForm])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await Taro.cloud.callFunction({ name: 'getUserProfile' })
      const result = res.result as any

      if (result && result.success) {
        const user = normalizeUserInfo(result.data)
        if (user) {
          const nextForm = {
            realName: user.realName,
            placementRegion: user.placementRegion,
            phone: user.phone,
            idNumber: user.idNumber,
            note: user.note,
          }

          setForm(nextForm)
          setInitialForm(nextForm)
          setAuditStatus(user.auditStatus || '')
        }
      }
    } catch (error) {
      console.error('获取认证信息失败', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const updateField = (field: keyof AuthForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePlacementRegionChange = (event: any) => {
    const value = event && event.detail ? event.detail.value : []
    const text = Array.isArray(value) ? value.join(' ') : ''
    updateField('placementRegion', text)
  }

  const handleMockBindPhone = async () => {
    try {
      setPhoneBinding(true)
      const mockPhone = `13${Math.floor(Math.random() * 900000000 + 100000000)}`
      updateField('phone', mockPhone)
      Taro.showToast({ title: '已模拟绑定手机号', icon: 'success' })
    } catch (error) {
      console.error('模拟绑定手机号失败', error)
      Taro.showToast({ title: '绑定失败', icon: 'none' })
    } finally {
      setPhoneBinding(false)
    }
  }

  const completeReviewLater = () => {
    setTimeout(async () => {
      try {
        const res = await Taro.cloud.callFunction({ name: 'completeVeteranAuthReview' })
        const result = res.result as any

        if (result && result.success) {
          setAuditStatus('approved')
          setInitialForm(form)
          Taro.setStorageSync('currentUser', result.data)
          Taro.showToast({ title: '认证成功', icon: 'success' })
        }
      } catch (error) {
        console.error('模拟审核完成失败', error)
      }
    }, 3000)
  }

  const handleSubmit = async () => {
    if (submitting) return

    if (!form.realName.trim()) {
      Taro.showToast({ title: '请填写真实姓名', icon: 'none' })
      return
    }

    if (!form.placementRegion.trim()) {
      Taro.showToast({ title: '请选择安置地', icon: 'none' })
      return
    }

    if (!form.phone.trim()) {
      Taro.showToast({ title: '请先绑定手机号', icon: 'none' })
      return
    }

    try {
      setSubmitting(true)
      const res = await Taro.cloud.callFunction({
        name: 'submitVeteranAuth',
        data: form,
      })
      const result = res.result as any

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '提交认证失败')
      }

      setAuditStatus('pending')
      Taro.setStorageSync('currentUser', result.data)
      Taro.showToast({ title: '审核中', icon: 'loading' })
      completeReviewLater()
    } catch (error) {
      console.error('提交认证失败', error)
      Taro.showToast({ title: '提交认证失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const statusText = getAuditStatusText(auditStatus, hasChanged && auditStatus === 'approved')
  const actionText = auditStatus === 'approved' && hasChanged ? '重新认证' : '提交认证'

  return (
    <View className='auth-page'>
      <View className='auth-header'>
        <View className='auth-title'>退役军人身份认证</View>
        <View className='auth-subtitle'>完善实名、安置地和手机号后，可提交认证审核。</View>
      </View>

      <View className='auth-status-card'>
        <Text className='auth-status-label'>当前状态</Text>
        <Text className={`auth-status-value ${statusText === '认证成功' ? 'auth-status-value-success' : ''}`}>{loading ? '加载中' : statusText}</Text>
        <Text className='auth-status-desc'>
          {statusText === '审核中'
            ? '资料已提交，系统正在审核，请稍候。'
            : statusText === '认证成功'
              ? '身份信息已通过认证，可正常使用相关服务。'
              : statusText === '需重新认证'
                ? '你已修改认证资料，请重新提交认证。'
                : '请填写完整信息后提交认证。'}
        </Text>
      </View>

      <View className='auth-card'>
        <View className='auth-row'>
          <Text className='auth-label'>真实姓名</Text>
          <Input
            className='auth-input'
            placeholder='请输入真实姓名'
            value={form.realName}
            onInput={(e) => updateField('realName', e.detail.value)}
          />
        </View>
        <View className='auth-row'>
          <Text className='auth-label'>安置地</Text>
          <Picker mode='region' onChange={handlePlacementRegionChange}>
            <View className='auth-picker'>
              <Text className={`auth-picker-text ${form.placementRegion ? '' : 'auth-placeholder'}`}>
                {form.placementRegion || '请选择省市区'}
              </Text>
            </View>
          </Picker>
        </View>
        <View className='auth-row auth-row-phone'>
          <Text className='auth-label'>手机号</Text>
          <View className='auth-phone-wrap'>
            <Text className={`auth-phone-text ${form.phone ? '' : 'auth-placeholder'}`}>{form.phone || '请先绑定手机号'}</Text>
            <View
              className='auth-phone-btn'
              onClick={() => {
                if (!phoneBinding) {
                  void handleMockBindPhone()
                }
              }}
            >
              <Text className='auth-phone-btn-text'>{phoneBinding ? '绑定中...' : form.phone ? '重新绑定' : '模拟绑定'}</Text>
            </View>
          </View>
        </View>
        <View className='auth-row'>
          <Text className='auth-label'>证件尾号</Text>
          <Input
            className='auth-input'
            placeholder='请输入身份证号后 6 位'
            value={form.idNumber}
            onInput={(e) => updateField('idNumber', e.detail.value)}
          />
        </View>
        <View className='auth-row auth-row-textarea'>
          <Text className='auth-label'>补充说明</Text>
          <Textarea
            className='auth-textarea'
            placeholder='可填写退役时间、证件编号等'
            value={form.note}
            onInput={(e) => updateField('note', e.detail.value)}
          />
        </View>
      </View>

      <View className='auth-card tips-card'>
        <View className='tips-title'>认证说明</View>
        <Text className='tips-text'>1. 提交后会先显示审核中，约 3 秒后模拟为认证成功。</Text>
        <Text className='tips-text'>2. 如认证成功后再次修改认证资料，按钮会变为重新认证。</Text>
        <Text className='tips-text'>3. 当前开发阶段手机号使用模拟绑定，提交后会同步写入云数据库。</Text>
      </View>

      <View className='auth-submit' onClick={handleSubmit}>
        <Text className='auth-submit-text'>{submitting ? '提交中...' : actionText}</Text>
      </View>
    </View>
  )
}

export default VeteranAuth
