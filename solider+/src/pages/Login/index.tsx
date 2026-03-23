import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

const Login = () => {
  const [agreed, setAgreed] = useState(false)

  const handleLogin = async () => {
    if (!agreed) {
      Taro.showToast({ title: '请先阅读并同意协议', icon: 'none' })
      return
    }

    try {
      Taro.showLoading({ title: '登录中...' })
      const res = await Taro.cloud.callFunction({
        name: 'loginHandler',
        data: {}
      })
      const result = res.result as any

      if (result && result.success) {
        Taro.setStorageSync('currentUser', result.data)
        Taro.removeStorageSync('skipLogin')
        Taro.hideLoading()
        const modalRes = await Taro.showModal({
          title: '温馨提示',
          content: '为了更好的体验，建议完善头像和昵称信息。',
          confirmText: '去完善',
          cancelText: '稍后',
          showCancel: true
        })
        if (modalRes.confirm) {
          Taro.redirectTo({ url: '/pages/UserInfo/index' })
        } else {
          Taro.navigateBack()
        }
      } else {
        Taro.showToast({ title: '登录失败', icon: 'none' })
      }
    } catch (err) {
      console.error('登录失败', err)
      Taro.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const handleSkip = () => {
    Taro.setStorageSync('skipLogin', true)
    
    Taro.navigateBack()
  }

  return (
    <View className='login-page'>
      <View className='login-logo'>
        <View className='logo-circle'>
          <Text className='logo-text'>兵+</Text>
        </View>
      </View>
      <Text className='login-title'>你好，老兵！</Text>

      <View
        className={`login-btn primary ${agreed ? '' : 'disabled'}`}
        onClick={handleLogin}
      >
        <Text className='login-btn-text'>一键登录</Text>
      </View>
      <View className='login-btn ghost' onClick={handleSkip}>
        <Text className='login-btn-text ghost-text'>暂不登录</Text>
      </View>

      <View className='login-policy' onClick={() => setAgreed(!agreed)}>
        <View className={`policy-check ${agreed ? 'checked' : ''}`} />
        <Text className='policy-text'>
          我已阅读并同意《隐私政策》《免责声明》《用户协议》《小程序隐私保护指引》中的相关条款内容。
        </Text>
      </View>
    </View>
  )
}

export default Login
