import { View, Text, Input, Textarea } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

const VeteranAuth = () => {
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [unit, setUnit] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    Taro.showToast({ title: '已提交，等待审核', icon: 'none' })
  }

  return (
    <View className='auth-page'>
      <View className='auth-header'>
        <View className='auth-title'>退役军人身份认证</View>
        <View className='auth-subtitle'>请填写真实信息，审核通过后可享受专属服务</View>
      </View>

      <View className='auth-card'>
        <View className='auth-row'>
          <Text className='auth-label'>姓名</Text>
          <Input
            className='auth-input'
            placeholder='请输入姓名'
            value={name}
            onInput={(e) => setName(e.detail.value)}
          />
        </View>
        <View className='auth-row'>
          <Text className='auth-label'>身份证号</Text>
          <Input
            className='auth-input'
            placeholder='请输入身份证号'
            value={idNumber}
            onInput={(e) => setIdNumber(e.detail.value)}
          />
        </View>
        <View className='auth-row'>
          <Text className='auth-label'>安置地</Text>
          <Input
            className='auth-input'
            placeholder='请输入原服役单位'
            value={unit}
            onInput={(e) => setUnit(e.detail.value)}
          />
        </View>
        <View className='auth-row auth-row-textarea'>
          <Text className='auth-label'>补充说明</Text>
          <Textarea
            className='auth-textarea'
            placeholder='可填写退役时间、退役证件编号等'
            value={note}
            onInput={(e) => setNote(e.detail.value)}
          />
        </View>
      </View>

      <View className='auth-card tips-card'>
        <View className='tips-title'>认证说明</View>
        <Text className='tips-text'>1. 资料提交后预计 1-3 个工作日完成审核。</Text>
        <Text className='tips-text'>2. 审核结果会在“我的-待办事项”中通知。</Text>
        <Text className='tips-text'>3. 如有疑问，可联系当地退役军人服务站。</Text>
      </View>

      <View className='auth-submit' onClick={handleSubmit}>
        <Text className='auth-submit-text'>提交认证</Text>
      </View>
    </View>
  )
}

export default VeteranAuth
