import { View, Text, Image } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'
import { ensureLoggedIn } from '../../utils/auth'

type TodoItem = {
  _id?: string
  content: string
  isCompleted: boolean
}

type TodoResult = {
  success?: boolean
  data?: {
    previewList?: TodoItem[]
    summary?: {
      totalCount?: number
      pendingCount?: number
      completedCount?: number
    }
  }
}

type SoulBlogResult = {
  success?: boolean
  data?: {
    stats?: {
      articleCount?: number
      categoryCount?: number
    }
  }
}

type HealthDashboardResult = {
  success?: boolean
  data?: {
    profile?: {
      userId?: string
      heightCm?: number
      latestWeightKg?: number
    }
  }
}

type UserMedalsResult = {
  success?: boolean
  data?: {
    summary?: {
      achievedCount?: number
      latestAchievedMedalName?: string
    }
  }
}

const normalizeUserInfo = (rawUser: any) => {
  if (!rawUser) return null
  const source = rawUser.data ? rawUser.data : rawUser

  return {
    name: source.nickname || source.name || source.real_name || '',
    nickname: source.nickname || source.name || '',
    avatar: source.avatar || '',
    openid: source.openid || source._id || '',
    _id: source._id || source.openid || '',
    realName: source.real_name || source.realName || '',
    phone: source.phone || '',
    isLogin: typeof source.isLogin === 'boolean'
      ? source.isLogin
      : source.is_login === true,
  }
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone || ''
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

const Mine = () => {
  const toolItems = [
    { key: 'train', label: '联系事务局', type: 'affairs' },
    { key: 'service', label: '常见问题', type: 'faq' },
    { key: 'official', label: '关于', type: 'about' },
  ]

  const [userInfo, setUserInfo] = useState<any>(null);
  const [, setLoading] = useState(true);
  const [todoPreview, setTodoPreview] = useState<TodoItem[]>([])
  const [soulStats, setSoulStats] = useState({
    articleCount: 0,
    categoryCount: 0,
  })
  const [healthStats, setHealthStats] = useState({
    heightCm: 0,
    latestWeightKg: 0,
  })
  const [medalStats, setMedalStats] = useState({
    achievedCount: 0,
    latestAchievedMedalName: '',
  })
  const displayName = userInfo && (userInfo.nickname || userInfo.name || userInfo.realName)
    ? (userInfo.nickname || userInfo.name || userInfo.realName)
    : ''
  const avatarText = displayName ? displayName.slice(0, 1) : ''

  const checkLogin = async () => {
    const localUser = normalizeUserInfo(Taro.getStorageSync('currentUser'))

    try {
      setLoading(true)
      if (!localUser) {
        setUserInfo(null)
        return null
      }

      setUserInfo(localUser)

      const res = await Taro.cloud.callFunction({
        name: 'checkLogin'
      })
      const result = res.result as any

      if (result && result.registered && result.isLogin && result.data) {
        const remoteUser = normalizeUserInfo({
          ...result.data,
          isLogin: result.isLogin,
        })
        setUserInfo(remoteUser)
        Taro.setStorageSync('currentUser', remoteUser)
        return remoteUser
      } else {
        setUserInfo(null)
        Taro.removeStorageSync('currentUser')
        return null
      }
    } catch (err) {
      console.error('检查登录失败', err)
      // 网络或云函数异常时保留本地态，避免页面来回闪动
      setUserInfo(localUser)
      return localUser
    } finally {
      setLoading(false)
    }
  }

  const loadTodoData = async () => {
    try {
      const res = await Taro.cloud.callFunction({
        name: 'getTodoList',
      })
      const result = res.result as TodoResult

      if (!result || !result.success || !result.data) {
        return
      }

      setTodoPreview(result.data.previewList || [])
    } catch (error) {
      console.error('获取待办事项概览失败', error)
    }
  }

  const loadMineCardData = async (isLoggedIn: boolean) => {
    if (!isLoggedIn) {
      setSoulStats({
        articleCount: 0,
        categoryCount: 0,
      })
      setHealthStats({
        heightCm: 0,
        latestWeightKg: 0,
      })
      setMedalStats({
        achievedCount: 0,
        latestAchievedMedalName: '',
      })
      return
    }

    try {
      const [soulRes, healthRes, medalRes] = await Promise.all([
        Taro.cloud.callFunction({ name: 'getSoulBlogHomeData' }),
        Taro.cloud.callFunction({ name: 'getHealthDashboard' }),
        Taro.cloud.callFunction({ name: 'getUserMedals' }),
      ])
      const soulResult = soulRes.result as SoulBlogResult
      const healthResult = healthRes.result as HealthDashboardResult
      const userMedalsResult = medalRes.result as UserMedalsResult

      if (soulResult && soulResult.success && soulResult.data && soulResult.data.stats) {
        setSoulStats({
          articleCount: soulResult.data.stats.articleCount || 0,
          categoryCount: soulResult.data.stats.categoryCount || 0,
        })
      }

      if (healthResult && healthResult.success && healthResult.data && healthResult.data.profile) {
        const isTemplateProfile = `${healthResult.data.profile.userId || ''}` === '__template__'
        setHealthStats({
          heightCm: isTemplateProfile ? 0 : (healthResult.data.profile.heightCm || 0),
          latestWeightKg: isTemplateProfile ? 0 : (healthResult.data.profile.latestWeightKg || 0),
        })
      }

      if (userMedalsResult && userMedalsResult.success && userMedalsResult.data && userMedalsResult.data.summary) {
        setMedalStats({
          achievedCount: userMedalsResult.data.summary.achievedCount || 0,
          latestAchievedMedalName: userMedalsResult.data.summary.latestAchievedMedalName || '',
        })
      }
    } catch (error) {
      console.error('获取我的页面卡片数据失败', error)
    }
  }

  useDidShow(() => {
    const loadPageData = async () => {
      const currentUser = await checkLogin()
      const isLoggedIn = !!(currentUser && currentUser.isLogin)

      await Promise.all([
        loadTodoData(),
        loadMineCardData(isLoggedIn),
      ])
    }

    void loadPageData()
  })

  // 登录页
  const goLogin = () => {
    Taro.navigateTo({ url: '/pages/Login/index' })
  }
  // 个人信息页展示
  const goUserInfo = () => {
    Taro.navigateTo({ url: '/pages/UserInfo/index' })
  }

  const goTodoPage = () => {
    if (!ensureLoggedIn()) {
      return
    }

    Taro.navigateTo({ url: '/pages/Todo/index' })
  }

  const goBenefitsApply = () => {
    Taro.navigateTo({ url: '/pages/BenefitsCardApply/index' })
  }

  const goSoulBlog = () => {
    if (!ensureLoggedIn()) {
      return
    }

    Taro.navigateTo({ url: '/pages/SoulBlog/index' })
  }

  const goHealth = () => {
    if (!ensureLoggedIn()) {
      return
    }

    Taro.navigateTo({ url: '/pages/Health/index' })
  }

  const goMedals = () => {
    if (!ensureLoggedIn()) {
      return
    }

    Taro.navigateTo({ url: '/pages/Medals/index' })
  }

  const goToolPage = (type: string) => {
    Taro.navigateTo({ url: `/pages/Mine/page/Info/index?type=${type}` })
  }

  return (
    <View className='mine-page'>
      <View className='mine-header'>
        <View className='profile'>
          <View className='avatar'>
            {userInfo && userInfo.avatar ? (
              <Image className='avatar-image' src={userInfo.avatar} mode='aspectFill' />
            ) : (
              <Text className='avatar-text'>{avatarText || '兵'}</Text>
            )}
          </View>
          <View>
            {/* 根据userInfo来判断是否登录 */}
            {userInfo ? <View className='profile-info' onClick={goUserInfo}>
              <Text className='profile-name'>{displayName || '已登录用户'}</Text>
              <Text className='profile-id'>{userInfo.phone ? maskPhone(userInfo.phone) : `ID：${userInfo.openid || '—'}`}</Text>
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
          <View className='member-btn' onClick={goBenefitsApply}>
            <Text className='member-btn-text'>立即体验</Text>
          </View>
        </View>
      </View>

      <View className='section mini-cards'>
        <View className='mini-card mini-card-clickable' onClick={goSoulBlog}>
          <Text className='mini-title'>军魂记录</Text>
          <View className='mini-body'>
            <View className='mini-icon mini-icon-record'>
              <Text className='mini-icon-text'>记</Text>
            </View>
            {userInfo ? (
              <View className='mini-meta'>
                <Text className='mini-meta-text'>文章 {soulStats.articleCount} 篇</Text>
                <Text className='mini-meta-text'>分类 {soulStats.categoryCount} 个</Text>
              </View>
            ) : null}
          </View>
          <Text className='mini-desc'>退伍别褪色哟～</Text>
        </View>
        <View className='mini-card mini-card-clickable' onClick={goMedals}>
          <Text className='mini-title'>荣耀奖章</Text>
          <View className='mini-body'>
            <View className='mini-icon mini-icon-medal'>
              <Text className='mini-icon-text mini-icon-text-medal'>奖</Text>
            </View>
            {userInfo ? (
              <View className='mini-meta'>
                <Text className='mini-meta-text'>已获 {medalStats.achievedCount} 枚</Text>
                <Text className='mini-meta-text'>{medalStats.latestAchievedMedalName || '等待点亮首枚勋章'}</Text>
              </View>
            ) : null}
          </View>
          <Text className='mini-desc'>军人荣光永存</Text>
        </View>
        <View className='mini-card mini-card-clickable' onClick={goHealth}>
          <Text className='mini-title'>军姿飒爽</Text>
          <View className='mini-body'>
            <View className='mini-icon mini-icon-health'>
              <Text className='mini-icon-text'>体</Text>
            </View>
            {userInfo ? (
              <View className='mini-meta'>
                <Text className='mini-meta-text'>身高 {healthStats.heightCm || '--'} cm</Text>
                <Text className='mini-meta-text'>体重 {healthStats.latestWeightKg || '--'} kg</Text>
              </View>
            ) : null}
          </View>
          <Text className='mini-desc'>身体是革命的本钱</Text>
        </View>
      </View>

      {/* 不忘初心，待办事项 */}
      <View className='section todo-card'>
        <View className='todo-header'>
          <Text className='section-title'>待办事项</Text>
          <Text className='todo-subtitle' onClick={goTodoPage}>查看全部</Text>
        </View>
        {todoPreview.length ? todoPreview.map((item, index) => (
          <View
            key={item._id || item.content}
            className={`todo-item ${index === todoPreview.length - 1 ? 'todo-item-last' : ''}`}
            onClick={goTodoPage}
          >
            <View className='todo-left'>
              <View className={`todo-dot ${item.isCompleted ? 'todo-dot-done' : 'todo-dot-service'}`} />
              <Text className={`todo-text ${item.isCompleted ? 'todo-text-done' : ''}`}>{item.content}</Text>
            </View>
            <View className='todo-right'>
              <Text className='todo-status'>{item.isCompleted ? '已完成' : '待完成'}</Text>
              <Text className='todo-arrow'>&gt;</Text>
            </View>
          </View>
        )) : (
          <View className='todo-empty-inline' onClick={goTodoPage}>
            <Text className='todo-empty-inline-text'>还没有待办事项，点击去添加第一条</Text>
          </View>
        )}
      </View>

      <View className='section tools-card'>
        <Text className='section-title'>常用工具</Text>
        {toolItems.map((item, index) => (
          <View
            key={item.key}
            className={`tool-item ${index === toolItems.length - 1 ? 'tool-item-last' : ''}`}
            onClick={() => goToolPage(item.type)}
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
