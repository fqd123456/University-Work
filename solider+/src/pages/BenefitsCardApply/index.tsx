import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const OFFICIAL_URL = 'https://wsfw.mva.gov.cn/#/index'

const noticeList = [
  '目前小程序内暂未直接接入官方优待证申领接口，以下提供官方平台入口与办理指引。',
  '办理前建议先准备身份证、退役相关证明材料以及实名手机号，具体以当地退役军人事务部门要求为准。',
  '如官方平台入口或办理规则调整，请以退役军人事务部门最新公告和官方平台页面为准。',
]

const stepList = [
  {
    title: '复制官方入口',
    desc: '点击下方按钮复制全国一体化退役军人网上服务平台官方链接。',
  },
  {
    title: '在浏览器打开',
    desc: '退出小程序后，在手机浏览器或电脑浏览器粘贴并打开链接。',
  },
  {
    title: '登录后办理',
    desc: '进入官方平台后，按页面提示完成实名认证并查找优待证相关申领入口。',
  },
]

const BenefitsCardApply = () => {
  const copyOfficialUrl = async (showSuccessToast = true) => {
    await Taro.setClipboardData({
      data: OFFICIAL_URL,
    })

    if (showSuccessToast) {
      Taro.showToast({
        title: '官方链接已复制',
        icon: 'success',
      })
    }
  }

  const handleCopy = async () => {
    try {
      await copyOfficialUrl()
    } catch (error) {
      console.error('复制官方链接失败', error)
      Taro.showToast({
        title: '复制失败，请稍后重试',
        icon: 'none',
      })
    }
  }

  const handleGoOfficial = async () => {
    try {
      await copyOfficialUrl(false)
      await Taro.showModal({
        title: '已复制官方链接',
        content: '由于微信小程序暂不能直接跳转到浏览器办理页面，请退出当前小程序后，在手机浏览器或电脑浏览器粘贴打开官方链接继续办理。',
        confirmText: '我知道了',
        showCancel: false,
      })
    } catch (error) {
      console.error('准备官方办理入口失败', error)
      Taro.showToast({
        title: '操作失败，请稍后重试',
        icon: 'none',
      })
    }
  }

  return (
    <View className='benefits-guide-page'>
      <View className='benefits-card'>
        <Text className='benefits-card-title'>官方平台说明</Text>
        <Text className='benefits-platform-name'>全国一体化退役军人网上服务平台</Text>
        <Text className='benefits-platform-desc'>
          当前推荐通过退役军人事务部相关官方平台入口办理优待证网上申请，小程序内先提供官方入口引导与复制能力。
        </Text>
        <View className='benefits-link-box'>
          <Text className='benefits-link-label'>官方入口链接</Text>
          <Text className='benefits-link-value'>{OFFICIAL_URL}</Text>
        </View>
      </View>

      <View className='benefits-card'>
        <Text className='benefits-card-title'>办理步骤</Text>
        <View className='benefits-step-list'>
          {stepList.map((item, index) => (
            <View key={item.title} className='benefits-step-item'>
              <View className='benefits-step-badge'>
                <Text className='benefits-step-badge-text'>{index + 1}</Text>
              </View>
              <View className='benefits-step-content'>
                <Text className='benefits-step-title'>{item.title}</Text>
                <Text className='benefits-step-desc'>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='benefits-card'>
        <Text className='benefits-card-title'>办理须知</Text>
        <View className='benefits-notice-list'>
          {noticeList.map((item) => (
            <View key={item} className='benefits-notice-item'>
              <View className='benefits-notice-dot' />
              <Text className='benefits-notice-text'>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='benefits-actions'>
        <View className='benefits-btn benefits-btn-primary' onClick={() => { void handleCopy() }}>
          <Text className='benefits-btn-primary-text'>复制官方链接</Text>
        </View>
        <View className='benefits-btn benefits-btn-secondary' onClick={() => { void handleGoOfficial() }}>
          <Text className='benefits-btn-secondary-text'>前往浏览器/官方平台办理</Text>
        </View>
      </View>

      <Text className='benefits-footer-note'>
        后续如拿到官方小程序直达参数或稳定接口，这里可以继续升级成一键跳转办理。
      </Text>
    </View>
  )
}

export default BenefitsCardApply
