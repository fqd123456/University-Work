import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

type ChatRole = 'assistant' | 'user'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  time: string
  status?: 'sending' | 'error'
}

const CHAT_STORAGE_KEY = 'ai_chat_messages'
const MAX_LOCAL_MESSAGES = 30

const capabilityTags = ['政策咨询', '退伍报到', '优待证办理', '社保接续', '就业培训', '复学指引']
const quickQuestions = [
  '退伍后第一步应该去哪里报到？',
  '优待证办理需要准备哪些材料？',
  '社保关系怎么转接？',
  '退役后想参加培训，有哪些常见路径？',
  '组织关系转移一般怎么办？',
]

const createMessageId = () => {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const formatTime = (date = new Date()) => {
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${hours}:${minutes}`
}

const createMessage = (role: ChatRole, content: string, status?: ChatMessage['status']): ChatMessage => {
  return {
    id: createMessageId(),
    role,
    content,
    time: formatTime(),
    status,
  }
}

const initialMessages: ChatMessage[] = [
  {
    id: 'assistant-welcome',
    role: 'assistant',
    content: '你好，我是你的AI三互小组长。我可以帮你梳理退伍报到、优待证、社保接续、就业培训、复学和常见政策问题。涉及地方细则时，你可以直接告诉我所在省市。',
    time: '刚刚',
  }
]

const normalizeStoredMessages = (rawValue: any): ChatMessage[] => {
  if (!Array.isArray(rawValue)) {
    return initialMessages
  }

  const nextMessages = rawValue
    .map((item) => {
      const role = item && (item.role === 'assistant' || item.role === 'user') ? item.role : ''
      const content = item && typeof item.content === 'string' ? item.content.trim() : ''
      const time = item && typeof item.time === 'string' ? item.time : formatTime()
      const status = item && (item.status === 'error' ? item.status : undefined)

      if (!role || !content) {
        return null
      }

      return {
        id: item.id || createMessageId(),
        role,
        content,
        time,
        status,
      } as ChatMessage
    })
    .filter(Boolean) as ChatMessage[]

  return nextMessages.length ? nextMessages.slice(-MAX_LOCAL_MESSAGES) : initialMessages
}

const getFriendlyErrorText = (error: any) => {
  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  if (error && typeof error.errMsg === 'string' && error.errMsg.trim()) {
    return error.errMsg
  }

  return '当前服务有点忙，请稍后再试。'
}

const AI = () => {
  const systemInfo = Taro.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 20
  const rpxToPx = (value: number) => {
    const windowWidth = systemInfo.windowWidth || 375
    return (windowWidth / 750) * value
  }
  const baseFooterBottomOffset = rpxToPx(18)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return normalizeStoredMessages(Taro.getStorageSync(CHAT_STORAGE_KEY))
  })
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [scrollIntoView, setScrollIntoView] = useState('')
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [layoutMetrics, setLayoutMetrics] = useState(() => ({
    headerHeight: statusBarHeight + rpxToPx(96),
    footerHeight: rpxToPx(160),
  }))
  const footerBottomOffset = keyboardHeight > 0
    ? keyboardHeight + rpxToPx(8)
    : baseFooterBottomOffset

  useEffect(() => {
    const lastMessage = messages.length ? messages[messages.length - 1] : null
    const bottomAnchorId = `chat-bottom-${lastMessage && lastMessage.id ? lastMessage.id : 'default'}`
    setScrollIntoView(bottomAnchorId)

    const stableMessages = messages
      .filter(item => item.status !== 'sending')
      .slice(-MAX_LOCAL_MESSAGES)

    Taro.setStorageSync(CHAT_STORAGE_KEY, stableMessages)
  }, [messages])

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = Taro.createSelectorQuery()
      query.select('.ai-header').boundingClientRect()
      query.select('.ai-footer').boundingClientRect()
      query.exec((res) => {
        const headerRect = res && res[0] ? res[0] : null
        const footerRect = res && res[1] ? res[1] : null

        setLayoutMetrics({
          headerHeight: headerRect && headerRect.height ? headerRect.height : statusBarHeight + rpxToPx(96),
          footerHeight: footerRect && footerRect.height ? footerRect.height : rpxToPx(160),
        })
      })
    }, 0)

    return () => clearTimeout(timer)
  }, [statusBarHeight])

  useEffect(() => {
    if (typeof Taro.onKeyboardHeightChange !== 'function') {
      return undefined
    }

    const handleKeyboardHeightChange = (event) => {
      const nextHeight = event && typeof event.height === 'number' ? event.height : 0
      setKeyboardHeight(nextHeight > 0 ? nextHeight : 0)
    }

    Taro.onKeyboardHeightChange(handleKeyboardHeightChange)

    return () => {
      if (typeof Taro.offKeyboardHeightChange === 'function') {
        Taro.offKeyboardHeightChange(handleKeyboardHeightChange)
      }
    }
  }, [])

  const replacePendingMessage = (pendingId: string, nextMessage: ChatMessage) => {
    setMessages((current) => {
      const hasPending = current.some(item => item.id === pendingId)

      if (!hasPending) {
        return [...current, nextMessage].slice(-MAX_LOCAL_MESSAGES)
      }

      return current.map((item) => {
        if (item.id !== pendingId) {
          return item
        }

        return nextMessage
      }).slice(-MAX_LOCAL_MESSAGES)
    })
  }

  const sendMessage = async (presetText?: string) => {
    const content = `${presetText !== undefined ? presetText : inputValue}`.trim()

    if (!content || sending) {
      return
    }

    const userMessage = createMessage('user', content)
    const pendingMessage = createMessage('assistant', '正在整理相关办理建议，请稍等...', 'sending')
    const historyForApi = [...messages, userMessage]
      .filter(item => item.role === 'assistant' || item.role === 'user')
      .filter(item => item.status !== 'sending')
      .map(item => ({
        role: item.role,
        content: item.content,
      }))

    setInputValue('')
    setSending(true)
    setMessages((current) => [...current, userMessage, pendingMessage].slice(-MAX_LOCAL_MESSAGES))

    try {
      const res = await Taro.cloud.callFunction({
        name: 'aiChat',
        data: {
          messages: historyForApi,
        }
      })

      const result = res.result as any
      if (!result || !result.success || !result.data || !result.data.reply) {
        throw new Error(result && result.message ? result.message : 'AI 暂时无法回复')
      }

      replacePendingMessage(pendingMessage.id, createMessage('assistant', result.data.reply))
    } catch (error) {
      replacePendingMessage(pendingMessage.id, createMessage('assistant', getFriendlyErrorText(error), 'error'))
    } finally {
      setSending(false)
    }
  }

  const handleReset = async () => {
    if (sending) {
      return
    }

    const modalRes = await Taro.showModal({
      title: '新对话',
      content: '确定清空当前聊天记录吗？',
      confirmText: '清空',
      cancelText: '取消',
    })

    if (!modalRes.confirm) {
      return
    }

    Taro.removeStorageSync(CHAT_STORAGE_KEY)
    setMessages(initialMessages)
    setInputValue('')
  }

  const lastMessage = messages.length ? messages[messages.length - 1] : null
  const currentBottomAnchorId = `chat-bottom-${lastMessage && lastMessage.id ? lastMessage.id : 'default'}`

  return (
    <View className='ai-page'>
      <View className='ai-header' style={{ paddingTop: `${statusBarHeight}px` }}>
        <View className='ai-header-main'>
          <View className='ai-header-title-row'>
            <Text className='ai-header-title'>三互小组长</Text>
            <Text className={`ai-header-reset ${sending ? 'ai-header-reset-disabled' : ''}`} onClick={handleReset}>
              新对话
            </Text>
          </View>
          <Text className='ai-header-subtitle'>聚焦退役军人办事咨询与政策解读</Text>
        </View>
      </View>

      <ScrollView
        className='ai-chat-scroll'
        scrollY
        scrollIntoView={scrollIntoView}
        scrollWithAnimation
        showScrollbar={false}
        style={{
          top: `${layoutMetrics.headerHeight}px`,
          bottom: `${layoutMetrics.footerHeight + footerBottomOffset}px`,
        }}
      >
        <View className='ai-chat-content'>
          <View className='ai-scope-card'>
            <Text className='ai-scope-title'>我可以帮你处理这些问题</Text>
            <View className='ai-scope-tags'>
              {capabilityTags.map(tag => (
                <View key={tag} className='ai-scope-tag'>
                  <Text>{tag}</Text>
                </View>
              ))}
            </View>
            <Text className='ai-scope-note'>
              我会优先提供办理步骤、材料准备和政策理解建议。涉及地方细则、金额、截止日期时，请尽量补充所在省市，最终以当地官方公告为准。
            </Text>
          </View>

          {messages.map(message => (
            <View
              key={message.id}
              className={`ai-message-row ${message.role === 'user' ? 'ai-message-row-user' : 'ai-message-row-assistant'}`}
            >
              {message.role === 'assistant' && (
                <View className='ai-avatar ai-avatar-assistant'>
                  <Text>AI</Text>
                </View>
              )}

              <View className='ai-message-stack'>
                <View
                  className={[
                    'ai-message-bubble',
                    message.role === 'user' ? 'ai-message-bubble-user' : 'ai-message-bubble-assistant',
                    message.status === 'error' ? 'ai-message-bubble-error' : '',
                    message.status === 'sending' ? 'ai-message-bubble-pending' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <Text className='ai-message-text'>{message.content}</Text>
                  <Text className='ai-message-meta'>
                    {message.status === 'sending' ? '思考中...' : message.time}
                  </Text>
                </View>
                {message.role === 'assistant' && message.status !== 'sending' && message.status !== 'error' && (
                  <Text className='ai-message-note'>
                    AI 生成内容仅供参考，具体请以当地退役军人事务部门最新政策和窗口要求为准。
                  </Text>
                )}
              </View>

              {message.role === 'user' && (
                <View className='ai-avatar ai-avatar-user'>
                  <Text>我</Text>
                </View>
              )}
            </View>
          ))}

          <View id={currentBottomAnchorId} className='ai-bottom-anchor' />
        </View>
      </ScrollView>

      <View className='ai-footer' style={{ bottom: `${footerBottomOffset}px` }}>
        <ScrollView className='ai-chip-scroll' scrollX showScrollbar={false}>
          <View className='ai-chip-list'>
            {quickQuestions.map(question => (
              <View
                key={question}
                className={`ai-chip ${sending ? 'ai-chip-disabled' : ''}`}
                onClick={() => sendMessage(question)}
              >
                <Text>{question}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View className='ai-input-bar'>
          <Input
            className='ai-input'
            value={inputValue}
            maxlength={500}
            placeholder='输入你的问题'
            placeholderClass='ai-input-placeholder'
            confirmType='send'
            adjustPosition={false}
            onInput={(event) => setInputValue(event.detail.value)}
            onConfirm={() => sendMessage()}
          />
          <View
            className={[
              'ai-send-btn',
              !inputValue.trim() || sending ? 'ai-send-btn-disabled' : ''
            ].filter(Boolean).join(' ')}
            onClick={() => sendMessage()}
          >
            <Text>{sending ? '发送中' : '发送'}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default AI
