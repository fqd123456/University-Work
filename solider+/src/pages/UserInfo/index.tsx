import { View, Text, Image, Input } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'

const normalizeUserInfo = (rawUser: any) => {
  if (!rawUser) return null
  const source = rawUser.data ? rawUser.data : rawUser

  return {
    name: source.name || source.real_name || source.nickname || '',
    nickname: source.nickname || source.name || '',
    avatar: source.avatar || '',
    openid: source.openid || source._id || '',
    _id: source._id || source.openid || '',
    phone: source.phone || '',
  }
}

const UserInfo = () => {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('')
  const [initialProfile, setInitialProfile] = useState({
    nickname: '',
    avatar: '',
  })

  useDidShow(() => {
    const cacheUser = normalizeUserInfo(Taro.getStorageSync('currentUser'))
    if (!cacheUser) {
      Taro.navigateBack()
      return
    }
    setUserInfo(cacheUser)
    setNickname(cacheUser.nickname || cacheUser.name || '')
    setAvatar(cacheUser.avatar || '')
    setInitialProfile({
      nickname: cacheUser.nickname || cacheUser.name || '',
      avatar: cacheUser.avatar || '',
    })
  })

  const hasPendingChanges = nickname !== initialProfile.nickname || avatar !== initialProfile.avatar

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
        setAvatar(tempPath)
      }
    } catch (err) {
      console.error('选择头像失败', err)
    }
  }

  const handleSave = async (silent?: boolean) => {
    if (!userInfo) return
    let saveSuccess = false

    try {
      Taro.showLoading({ title: '保存中...' })
      let avatarToSave = avatar

      if (avatar && avatar.indexOf('cloud://') !== 0) {
        const ext = avatar.split('.').pop() || 'jpg'
        const userId = userInfo.openid || userInfo._id || 'user'
        const cloudPath = `avatars/${userId}_${Date.now()}.${ext}`
        const uploadRes = await Taro.cloud.uploadFile({
          cloudPath,
          filePath: avatar
        })
        avatarToSave = uploadRes.fileID
      }

      const res = await Taro.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          nickname,
          avatar: avatarToSave
        }
      })
      const result = res.result as any

      if (result && result.success) {
        const newUser = normalizeUserInfo(result.data)
        Taro.setStorageSync('currentUser', newUser)
        setUserInfo(newUser)
        setAvatar(newUser.avatar || avatarToSave || '')
        setNickname(newUser.nickname || nickname || '')
        setInitialProfile({
          nickname: newUser.nickname || nickname || '',
          avatar: newUser.avatar || avatarToSave || '',
        })
        saveSuccess = true
        if (!silent) {
          Taro.showToast({ title: '已保存' })
        }
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
    } catch (err) {
      console.error('保存失败', err)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }

    return saveSuccess
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
      setNickname('')
      setAvatar('')
      setInitialProfile({ nickname: '', avatar: '' })
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

  const phone = userInfo && userInfo.phone ? userInfo.phone : '未绑定'

  return (
    <View className='user-page'>
      <View className='user-card'>
        <View className='user-row'>
          <Text className='row-label'>头像</Text>
          <View className='row-right' onClick={chooseAvatar}>
            {avatar ? (
              <Image className='avatar-img' src={avatar} mode='aspectFill' />
            ) : (
              <View className='avatar-placeholder'>
                <Text className='avatar-text'>人</Text>
              </View>
            )}
            <Text className='row-arrow'>&gt;</Text>
          </View>
        </View>
        <View className='divider' />
        <View className='user-row'>
          <Text className='row-label'>用户名</Text>
          <View className='row-right'>
            <Input
              className='row-input'
              value={nickname}
              placeholder='微信用户'
              onInput={(e) => setNickname(e.detail.value)}
            />
            <Text className='row-arrow'>&gt;</Text>
          </View>
        </View>
        <View className='divider' />
        <View className='user-row'>
          <Text className='row-label'>手机号</Text>
          <View className='row-right'>
            <Text className='row-value'>{phone}</Text>
            <Text className='row-arrow'>&gt;</Text>
          </View>
        </View>
      </View>

      <View>
        <Text className='guide-desc'>完成退役军人身份认证后可解锁更多。</Text>
        <Text className='guide-desc' onClick={() => Taro.navigateTo({ url: '/pages/VeteranAuth/index' })}>去认证</Text>
      </View>

      {hasPendingChanges && (
        <View className='save-wrap'>
          <View className='save-btn' onClick={() => handleSave()}>
            <Text className='save-text'>保存修改</Text>
          </View>
        </View>
      )}

      <View className='logout-wrap'>
        <View className='logout-btn' onClick={handleLogout}>
          <Text className='logout-text'>退出登录</Text>
        </View>
        <Text className='cancel-text'>我要注销</Text>
      </View>
    </View>
  )
}

export default UserInfo
