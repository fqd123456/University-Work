import { View, Text, Image, Input, Textarea, Picker } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'

type UserProfile = {
  name: string
  nickname: string
  avatar: string
  openid: string
  _id: string
  phone: string
  realName: string
  gender: string
  serviceRegion: string
  birthDate: string
  bio: string
  auditStatus: string
  isLogin: boolean
}

type EditableProfile = {
  nickname: string
  avatar: string
  gender: string
  birthDate: string
  bio: string
}

const genderOptions = ['未设置', '男', '女']

const emptyEditableProfile: EditableProfile = {
  nickname: '',
  avatar: '',
  gender: '',
  birthDate: '',
  bio: '',
}

const normalizeUserInfo = (rawUser: any): UserProfile | null => {
  if (!rawUser) return null
  const source = rawUser.data ? rawUser.data : rawUser

  return {
    name: source.nickname || source.name || source.real_name || source.realName || '',
    nickname: source.nickname || source.name || '',
    avatar: source.avatar || '',
    openid: source.openid || source._id || '',
    _id: source._id || source.openid || '',
    phone: source.phone || '',
    realName: source.real_name || source.realName || '',
    gender: source.gender || '',
    serviceRegion: source.service_region || source.serviceRegion || '',
    birthDate: source.birth_date || source.birthDate || '',
    bio: source.bio || '',
    auditStatus: source.auditStatus || source.audit_status || '',
    isLogin: typeof source.isLogin === 'boolean'
      ? source.isLogin
      : source.is_login === true,
  }
}

const getEditableProfile = (profile: UserProfile | null): EditableProfile => {
  if (!profile) {
    return {
      ...emptyEditableProfile,
    }
  }

  return {
    nickname: profile.nickname || profile.name || '',
    avatar: profile.avatar || '',
    gender: profile.gender || '',
    birthDate: profile.birthDate || '',
    bio: profile.bio || '',
  }
}

const getAuditStatusLabel = (auditStatus: string) => {
  if (!auditStatus) return '未认证'
  const status = `${auditStatus}`.toLowerCase()

  if (status === 'approved' || status === 'success' || status === 'passed' || status === 'done') {
    return '已认证'
  }
  if (status === 'pending' || status === 'processing' || status === 'reviewing') {
    return '审核中'
  }
  if (status === 'rejected' || status === 'failed' || status === 'refused') {
    return '未通过'
  }

  return auditStatus
}

const getGenderPickerIndex = (gender: string) => {
  const target = gender || ''
  const index = genderOptions.indexOf(target)
  return index > -1 ? index : 0
}

const UserInfo = () => {
  const [userInfo, setUserInfo] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<EditableProfile>({
    ...emptyEditableProfile,
  })
  const [initialProfile, setInitialProfile] = useState<EditableProfile>({
    ...emptyEditableProfile,
  })
  const [pageLoading, setPageLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const hasLoadedRef = useRef(false)

  const hasPendingChanges = (
    form.nickname !== initialProfile.nickname
    || form.avatar !== initialProfile.avatar
    || form.gender !== initialProfile.gender
    || form.birthDate !== initialProfile.birthDate
    || form.bio !== initialProfile.bio
  )

  const updateStoredUser = (nextUser: UserProfile) => {
    setUserInfo(nextUser)
    Taro.setStorageSync('currentUser', nextUser)
  }

  const syncProfileState = (nextUser: UserProfile) => {
    const nextForm = getEditableProfile(nextUser)
    updateStoredUser(nextUser)
    setForm(nextForm)
    setInitialProfile(nextForm)
  }

  const loadUserProfile = async () => {
    const cacheUser = normalizeUserInfo(Taro.getStorageSync('currentUser'))

    if (!cacheUser && !userInfo) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      Taro.navigateBack()
      return
    }

    if (cacheUser && !userInfo) {
      const cacheForm = getEditableProfile(cacheUser)
      setUserInfo(cacheUser)
      setForm(cacheForm)
      setInitialProfile(cacheForm)
    }

    try {
      setPageLoading(true)
      const res = await Taro.cloud.callFunction({
        name: 'getUserProfile',
      })
      const result = res.result as any

      if (result && result.success && result.data) {
        const remoteUser = normalizeUserInfo(result.data)
        if (remoteUser) {
          syncProfileState(remoteUser)
        }
      }
    } catch (err) {
      console.error('获取用户资料失败', err)
    } finally {
      setPageLoading(false)
    }
  }

  useDidShow(() => {
    const shouldRefresh = !hasLoadedRef.current || !hasPendingChanges
    if (shouldRefresh) {
      hasLoadedRef.current = true
      void loadUserProfile()
    }
  })

  useEffect(() => {
    if (hasPendingChanges) {
      Taro.enableAlertBeforeUnload({
        message: '用户信息已修改，离开后未保存内容将丢失'
      })
    } else {
      Taro.disableAlertBeforeUnload()
    }

    return () => {
      Taro.disableAlertBeforeUnload()
    }
  }, [hasPendingChanges])

  const chooseAvatar = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      const tempPath = res.tempFilePaths && res.tempFilePaths[0]
      if (tempPath) {
        setForm((prev) => ({
          ...prev,
          avatar: tempPath,
        }))
      }
    } catch (err) {
      console.error('选择头像失败', err)
    }
  }

  const updateField = (field: keyof EditableProfile, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleGenderChange = (event: any) => {
    const nextIndex = Number(event.detail.value)
    updateField('gender', nextIndex > 0 ? genderOptions[nextIndex] : '')
  }

  const handleBirthDateChange = (event: any) => {
    const value = event && event.detail ? `${event.detail.value || ''}` : ''
    updateField('birthDate', value)
  }

  const handleSave = async () => {
    if (!userInfo || saveLoading) return

    const nextNickname = form.nickname.trim()
    if (!nextNickname) {
      Taro.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }

    try {
      setSaveLoading(true)
      Taro.showLoading({ title: '保存中...' })
      let avatarToSave = form.avatar

      if (form.avatar && form.avatar.indexOf('cloud://') !== 0) {
        const avatarParts = form.avatar.split('.')
        const ext = avatarParts.length > 1 ? avatarParts[avatarParts.length - 1] : 'jpg'
        const userId = userInfo.openid || userInfo._id || 'user'
        const cloudPath = `avatars/${userId}_${Date.now()}.${ext}`
        const uploadRes = await Taro.cloud.uploadFile({
          cloudPath,
          filePath: form.avatar
        })
        avatarToSave = uploadRes.fileID
      }

      const res = await Taro.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          nickname: nextNickname,
          avatar: avatarToSave,
          gender: form.gender,
          birthDate: form.birthDate,
          bio: form.bio,
        }
      })
      const result = res.result as any

      if (result && result.success) {
        const savedUser = normalizeUserInfo(result.data)
        if (savedUser) {
          syncProfileState(savedUser)
        } else {
          const fallbackUser: UserProfile = {
            ...userInfo,
            nickname: nextNickname,
            name: nextNickname,
            avatar: avatarToSave,
            gender: form.gender,
            birthDate: form.birthDate,
            bio: form.bio,
          }
          syncProfileState(fallbackUser)
        }
        Taro.showToast({ title: '已保存', icon: 'success' })
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
    } catch (err) {
      console.error('保存失败', err)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSaveLoading(false)
      Taro.hideLoading()
    }
  }

  const performLogout = async () => {
    Taro.showLoading({ title: '正在退出...' })

    try {
      const res = await Taro.cloud.callFunction({ name: 'logoutHandler' })
      const result = res.result as any
      if (result && result.success === false) {
        console.error('云端退出失败', result)
      }
    } catch (err) {
      console.error('退出登录失败', err)
    } finally {
      Taro.removeStorageSync('currentUser')
      Taro.setStorageSync('skipLogin', true)
      setUserInfo(null)
      setForm({
        ...emptyEditableProfile,
      })
      setInitialProfile({
        ...emptyEditableProfile,
      })
      Taro.disableAlertBeforeUnload()
      Taro.switchTab({ url: '/pages/Mine/index' })
      Taro.hideLoading()
    }
  }

  const confirmDiscardChanges = async () => {
    const res = await Taro.showModal({
      title: '信息已修改',
      content: '当前修改尚未保存，确认直接离开吗？',
      confirmText: '直接离开',
      cancelText: '继续编辑',
      confirmColor: '#9f4747',
      cancelColor: '#6b7280'
    })

    return res.confirm
  }

  const confirmLogout = async () => {
    const res = await Taro.showModal({
      title: '退出登录',
      content: '确认退出当前账号吗？',
      confirmText: '退出登录',
      cancelText: '取消',
      confirmColor: '#9f4747',
      cancelColor: '#6b7280'
    })

    return res.confirm
  }

  const handleLogout = async () => {
    if (hasPendingChanges) {
      const canLeave = await confirmDiscardChanges()
      if (canLeave) {
        await performLogout()
      }
      return
    }

    const confirmed = await confirmLogout()
    if (confirmed) {
      await performLogout()
    }
  }

  const auditStatusLabel = getAuditStatusLabel(userInfo ? userInfo.auditStatus : '')
  const canSave = hasPendingChanges && !saveLoading && !pageLoading

  return (
    <View className='user-page'>
      <View className='user-hero'>
        <Text className='user-hero-title'>完善个人信息</Text>
        <Text className='user-hero-desc'>
          {pageLoading ? '资料同步中...' : '这里维护昵称、头像和个人简介，实名信息请到身份认证页填写。'}
        </Text>
      </View>

      <View className='user-card'>
        <Text className='section-title'>基础资料</Text>

        <View className='user-row'>
          <Text className='row-label'>头像</Text>
          <View className='row-right row-right-avatar' onClick={chooseAvatar}>
            {form.avatar ? (
              <Image className='avatar-img' src={form.avatar} mode='aspectFill' />
            ) : (
              <View className='avatar-placeholder'>
                <Text className='avatar-text'>兵</Text>
              </View>
            )}
            <Text className='row-value row-action-text'>更换</Text>
            <Text className='row-arrow'>&gt;</Text>
          </View>
        </View>

        <View className='divider' />

        <View className='user-row'>
          <Text className='row-label'>昵称</Text>
          <View className='row-input-wrap'>
            <Input
              className='row-input'
              value={form.nickname}
              maxlength={20}
              placeholder='请输入昵称'
              onInput={(event) => updateField('nickname', event.detail.value)}
            />
          </View>
        </View>

        <View className='divider' />

        <View className='user-row'>
          <Text className='row-label'>性别</Text>
          <Picker
            mode='selector'
            range={genderOptions}
            value={getGenderPickerIndex(form.gender)}
            onChange={handleGenderChange}
          >
            <View className='picker-trigger'>
              <Text className={`row-value ${form.gender ? '' : 'row-placeholder'}`}>
                {form.gender || '请选择'}
              </Text>
              <Text className='row-arrow'>&gt;</Text>
            </View>
          </Picker>
        </View>

        <View className='divider' />

        <View className='user-row'>
          <Text className='row-label'>出生年月</Text>
          <Picker mode='date' fields='month' value={form.birthDate} onChange={handleBirthDateChange}>
            <View className='picker-trigger'>
              <Text className={`row-value ${form.birthDate ? '' : 'row-placeholder'}`}>
                {form.birthDate || '请选择出生年月'}
              </Text>
              <Text className='row-arrow'>&gt;</Text>
            </View>
          </Picker>
        </View>

      </View>

      <View className='user-card'>
        <View className='section-head'>
          <Text className='section-title'>个人简介</Text>
          <Text className='section-tag'>选填</Text>
        </View>
        <Textarea
          className='bio-textarea'
          maxlength={120}
          value={form.bio}
          placeholder='介绍一下自己，如退役年份、擅长方向、目前需求等'
          onInput={(event) => updateField('bio', event.detail.value)}
        />
        <Text className='textarea-count'>{form.bio.length}/120</Text>
      </View>

      <View className='user-card user-card-compact'>
        <View className='status-row'>
          <View>
            <Text className='section-title'>身份认证</Text>
            <Text className='status-desc'>完成退役军人认证，享受更多专属服务与便捷办理能力。</Text>
          </View>
          <View className='status-side'>
            <Text className={`status-badge ${auditStatusLabel === '已认证' ? 'status-badge-success' : ''}`}>
              {auditStatusLabel}
            </Text>
            <Text
              className='status-link'
              onClick={() => Taro.navigateTo({ url: '/pages/VeteranAuth/index' })}
            >
              {auditStatusLabel === '已认证' ? '查看认证' : '去认证'}
            </Text>
          </View>
        </View>
      </View>

      <View className='action-wrap'>
        <View
          className={`save-btn ${canSave ? '' : 'save-btn-disabled'}`}
          onClick={() => {
            if (canSave) {
              void handleSave()
            }
          }}
        >
          <Text className='save-text'>{saveLoading ? '保存中...' : hasPendingChanges ? '保存修改' : '暂无修改'}</Text>
        </View>
      </View>

      <View className='logout-wrap'>
        <View className='logout-btn' onClick={handleLogout}>
          <Text className='logout-text'>退出登录</Text>
        </View>
        <Text className='cancel-text'>如需注销账号，请联系当地服务站协助处理。</Text>
      </View>
    </View>
  )
}

export default UserInfo
