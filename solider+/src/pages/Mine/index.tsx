import { View, Text } from '@tarojs/components'
import { useState } from 'react'
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
    isLogin: typeof source.isLogin === 'boolean'
      ? source.isLogin
      : source.is_login === true,
  }
}

const Mine = () => {
  const todoItems = [
    { key: 'profile', label: '完善个人信息', status: '未完成' },
    { key: 'card', label: '绑定优待证', status: '待办理' },
    { key: 'service', label: '提交转接材料', status: '待确认' },
  ]

  const toolItems = [
    { key: 'train', label: '联系事务局' },
    { key: 'service', label: '常见问题' },
    { key: 'official', label: '关于' },
  ]

  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const displayName = userInfo && (userInfo.name || userInfo.nickname)
    ? (userInfo.name || userInfo.nickname)
    : ''
  const avatarText = displayName ? displayName.slice(0, 1) : ''

  const checkLogin = async () => {
    const localUser = normalizeUserInfo(Taro.getStorageSync('currentUser'))

    try {
      setLoading(true)
      if (!localUser) {
        setUserInfo(null)
        return
      }

      setUserInfo(localUser)

      const res = await Taro.cloud.callFunction({
        name: 'checkLogin'
      })
      const result = res.result as any

      if (result && result.registered && result.isLogin && result.data) {
        const remoteUser = normalizeUserInfo(result.data)
        setUserInfo(remoteUser)
        Taro.setStorageSync('currentUser', remoteUser)
      } else {
        setUserInfo(null)
        Taro.removeStorageSync('currentUser')
      }
    } catch (err) {
      console.error('检查登录失败', err)
      // 网络或云函数异常时保留本地态，避免页面来回闪动
      setUserInfo(localUser)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    checkLogin()
  })

  // 登录页
  const goLogin = () => {
    Taro.navigateTo({ url: '/pages/Login/index' })
  }
  // 个人信息页展示
  const goUserInfo = () => {
    Taro.navigateTo({ url: '/pages/UserInfo/index' })
  }

  return (
    <View className='mine-page'>
      <View className='mine-header'>
        <View className='profile'>
          <View className='avatar'>
            {/* 传入头像 */}
            <Text className='avatar-text'>{avatarText}</Text>
          </View>
          <View>
            {/* 根据userInfo来判断是否登录 */}
            {userInfo ? <View className='profile-info' onClick={goUserInfo}>
              <Text className='profile-name'>{displayName || '已登录用户'}</Text>
              <Text className='profile-id'>ID：{userInfo.openid || '—'}</Text>
            </View> : <Text className='profile-name' onClick={goLogin}>登录/注册</Text>}
          </View>
        </View>

        <View className='member-card'>
          <View className='member-left'>
            <View className='member-badge'>
              {/* 优待证图标 */}
              <Text className='member-badge-text'>V</Text>
            </View>
            <View className='member-text'>
              <Text className='member-title'>优待证（电子版）</Text>
              <Text className='member-desc'>绑定后可使用优待证相关功能</Text>
            </View>
          </View>
          <View className='member-btn'>
            <Text className='member-btn-text'>立即体验</Text>
          </View>
        </View>
      </View>

      <View className='section mini-cards'>
        <View className='mini-card'>
          <Text className='mini-title'>军魂记录</Text>
          <View className='mini-icon mini-icon-record'>
            <Text className='mini-icon-text'>记</Text>
          </View>
          <Text className='mini-desc'>退伍别褪色哟～</Text>
        </View>
        <View className='mini-card'>
          <Text className='mini-title'>军魂勋章</Text>
          <View className='mini-icon mini-icon-medal'>
            <Text className='mini-icon-text'>奖</Text>
          </View>
          <Text className='mini-desc'>暂未获得军魂勋章</Text>
        </View>
        <View className='mini-card'>
          <Text className='mini-title'>军姿飒爽</Text>
          <View className='mini-icon mini-icon-medal'>
            <Text className='mini-icon-text'>爽</Text>
          </View>
          <Text className='mini-desc'>暂无身体健康信息</Text>
        </View>
      </View>

      {/* 不忘初心，待办事项 */}
      <View className='section todo-card'>
        <View className='todo-header'>
          <Text className='section-title'>待办事项</Text>
          <Text className='todo-subtitle'>不忘初心</Text>
        </View>
        {todoItems.map((item, index) => (
          <View
            key={item.key}
            className={`todo-item ${index === todoItems.length - 1 ? 'todo-item-last' : ''}`}
          >
            <View className='todo-left'>
              <View className={`todo-dot todo-dot-${item.key}`} />
              <Text className='todo-text'>{item.label}</Text>
            </View>
            <View className='todo-right'>
              <Text className='todo-status'>{item.status}</Text>
              <Text className='todo-arrow'>&gt;</Text>
            </View>
          </View>
        ))}
      </View>

      <View className='section tools-card'>
        <Text className='section-title'>常用工具</Text>
        {toolItems.map((item, index) => (
          <View
            key={item.key}
            className={`tool-item ${index === toolItems.length - 1 ? 'tool-item-last' : ''}`}
          >
            <View className='tool-left'>
              <View className={`tool-icon tool-icon-${item.key}`} />
              <Text className='tool-text'>{item.label}</Text>
            </View>
            <Text className='tool-arrow'>&gt;</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default Mine
