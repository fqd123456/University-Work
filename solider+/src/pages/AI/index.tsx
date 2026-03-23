import { View, Text, Input, ScrollView } from '@tarojs/components'
import './index.scss'

const AI = () => {
  const quickQuestions = [
    '查话费', '查流量', '查套餐', '故障报修',
    '政企', '已订业务', '我的订单', '一证通查', '更多功能',
  ]

  const quickActions = ['退伍业务办理', '职业生涯规划', '政策咨询', '身材管理', '退伍复学']

  return (
    <View className='ai-page'>
      {/* 1. 顶部标题 (固定高度) */}
      <View className='ai-title-wrap'>
        <View className='ai-title'>
          <Text>三互</Text>
          <View className='ai-help'>?</View>
        </View>
      </View>

      {/* 2. 内容区域 */}
      <ScrollView
        className='ai-scroll-area'
        scrollY
        enhanced
        showScrollbar={false}
        bounces={true}
      >
        <View className='ai-scroll-content'>
          <View className='ai-chat-card'>
            <Text className='ai-chat-text'>
              同志你好，我是你的三互小组长，可以解答你退伍后一些疑惑，并给你提供一些帮助。
            </Text>
            <View className='ai-chat-actions'>
              {quickActions.map(item => (
                <View key={item} className='ai-chat-chip'>
                  <Text>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className='ai-section'>
            <View className='ai-section-title'>
              <View className='ai-divider' />
              <Text className='ai-section-text'>猜你想问</Text>
              <View className='ai-divider' />
            </View>

          </View>

          <View className='ai-feedback'>
            <Text className='ai-feedback-text'>AI生成，供参考</Text>
            <View className='ai-feedback-actions'>
              <View className='ai-feedback-btn'>赞</View>
              <View className='ai-feedback-btn'>踩</View>
            </View>
          </View>

        </View>
      </ScrollView>

      <View className='bottom'>
        <ScrollView
          className='ai-chips-scroll'
          scrollX
          showScrollbar={false}
          enhanced // 开启增强模式（iOS 回弹效果）
        >
          <View className='ai-chips'>
            {quickQuestions.map(item => (
              <View key={item} className='ai-chip'>
                <Text>{item}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View className='ai-input-bar'>
          <View className='ai-input-icon'>语</View>
          <Input
            className='ai-input'
            placeholder='有什么问题请问我'
            placeholderClass='ai-input-placeholder'
            confirmType='send'
          />
          <View className='ai-send'>发</View>
          <View className='ai-plus'>+</View>
        </View>
      </View>
    </View>
  )
}

export default AI
