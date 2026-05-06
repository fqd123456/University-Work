import { Input, Text, View } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../components/LightLoading'
import './index.scss'

type TodoItem = {
  _id?: string
  content: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
  completedAt?: string
}

type TodoResult = {
  success?: boolean
  message?: string
  data?: {
    list?: TodoItem[]
    previewList?: TodoItem[]
    summary?: {
      totalCount?: number
      pendingCount?: number
      completedCount?: number
    }
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '操作失败，请稍后重试'
}

const TodoPage = () => {
  const [list, setList] = useState<TodoItem[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [summary, setSummary] = useState({
    totalCount: 0,
    pendingCount: 0,
    completedCount: 0,
  })

  const loadTodoList = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getTodoList',
      })
      const result = res.result as TodoResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取待办事项失败')
      }

      setList(result.data.list || [])
      setSummary({
        totalCount: result.data.summary && result.data.summary.totalCount ? result.data.summary.totalCount : 0,
        pendingCount: result.data.summary && result.data.summary.pendingCount ? result.data.summary.pendingCount : 0,
        completedCount: result.data.summary && result.data.summary.completedCount ? result.data.summary.completedCount : 0,
      })
    } catch (error) {
      console.error('加载待办事项失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadTodoList()
  })

  const pendingList = list.filter((item) => !item.isCompleted)
  const completedList = list.filter((item) => !!item.isCompleted)

  const handleSubmit = async () => {
    const content = inputValue.trim()

    if (!content) {
      Taro.showToast({ title: '请输入待办内容', icon: 'none' })
      return
    }

    setSubmitting(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'saveTodoItem',
        data: {
          content,
        },
      })
      const result = res.result as TodoResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '新增失败')
      }

      setInputValue('')
      Taro.showToast({ title: '已添加', icon: 'success' })
      await loadTodoList()
    } catch (error) {
      console.error('新增待办事项失败', error)
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (item: TodoItem) => {
    if (!item._id) {
      return
    }

    try {
      const res = await Taro.cloud.callFunction({
        name: 'toggleTodoItem',
        data: {
          todoId: item._id,
          isCompleted: !item.isCompleted,
        },
      })
      const result = res.result as TodoResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '更新失败')
      }

      Taro.showToast({
        title: item.isCompleted ? '已恢复待办' : '已完成',
        icon: 'success',
      })
      await loadTodoList()
    } catch (error) {
      console.error('更新待办状态失败', error)
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    }
  }

  const handleDelete = async (item: TodoItem) => {
    if (!item._id) {
      return
    }

    try {
      const modalRes = await Taro.showModal({
        title: '删除待办',
        content: '确认删除这条待办事项吗？',
      })

      if (!modalRes.confirm) {
        return
      }

      const res = await Taro.cloud.callFunction({
        name: 'deleteTodoItem',
        data: {
          todoId: item._id,
        },
      })
      const result = res.result as TodoResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '删除失败')
      }

      Taro.showToast({ title: '已删除', icon: 'success' })
      await loadTodoList()
    } catch (error) {
      console.error('删除待办事项失败', error)
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    }
  }

  return (
    <View className='todo-page'>
      <View className='todo-composer'>
        <Input
          className='todo-input'
          placeholder='添加新的待办事项，例如：准备报到材料'
          maxlength={60}
          value={inputValue}
          onInput={(event) => setInputValue(event.detail.value)}
        />
        <View className={`todo-submit-btn ${submitting ? 'todo-submit-btn-disabled' : ''}`} onClick={() => { void handleSubmit() }}>
          <Text className='todo-submit-btn-text'>{submitting ? '添加中' : '添加'}</Text>
        </View>
      </View>

      {loading && <LightLoading text='正在获取待办事项...' />}

      {!loading && errorText && (
        <View className='todo-state-card todo-state-card-error' onClick={loadTodoList}>
          <Text className='todo-state-title'>加载失败</Text>
          <Text className='todo-state-desc'>{errorText}</Text>
          <Text className='todo-state-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <View className='todo-board-card'>
          <View className='todo-summary-row'>
            <View className='todo-summary-item'>
              <Text className='todo-summary-value'>{summary.totalCount}</Text>
              <Text className='todo-summary-label'>全部</Text>
            </View>
            <View className='todo-summary-divider' />
            <View className='todo-summary-item'>
              <Text className='todo-summary-value'>{summary.pendingCount}</Text>
              <Text className='todo-summary-label'>待完成</Text>
            </View>
            <View className='todo-summary-divider' />
            <View className='todo-summary-item'>
              <Text className='todo-summary-value'>{summary.completedCount}</Text>
              <Text className='todo-summary-label'>已完成</Text>
            </View>
          </View>

          <View className='todo-block-divider' />

          <View className='todo-section'>
            <View className='todo-section-head'>
              <Text className='todo-section-title'>待完成</Text>
              <Text className='todo-section-count'>{pendingList.length} 项</Text>
            </View>
            {pendingList.length ? pendingList.map((item) => (
              <View key={item._id || item.content} className='todo-item-card'>
                <View className='todo-item-main'>
                  <View className='todo-item-check todo-item-check-pending' onClick={() => { void handleToggle(item) }}>
                    <Text className='todo-item-check-icon'>○</Text>
                  </View>
                  <View className='todo-item-content'>
                    <Text className='todo-item-text'>{item.content}</Text>
                    <Text className='todo-item-time'>更新于 {item.updatedAt}</Text>
                  </View>
                </View>
                <View className='todo-item-delete' onClick={() => { void handleDelete(item) }}>
                  <Text className='todo-item-delete-text'>删除</Text>
                </View>
              </View>
            )) : (
              <View className='todo-empty-inline-card'>
                <Text className='todo-empty-title'>当前没有待完成事项</Text>
                <Text className='todo-empty-desc'>可以先在上方输入一条新的待办内容。</Text>
              </View>
            )}
          </View>

          <View className='todo-block-divider' />

          <View className='todo-section'>
            <View className='todo-section-head'>
              <Text className='todo-section-title'>已完成</Text>
              <Text className='todo-section-count'>{completedList.length} 项</Text>
            </View>
            {completedList.length ? completedList.map((item) => (
              <View key={item._id || item.content} className='todo-item-card todo-item-card-completed'>
                <View className='todo-item-main'>
                  <View className='todo-item-check todo-item-check-completed' onClick={() => { void handleToggle(item) }}>
                    <Text className='todo-item-check-icon'>✓</Text>
                  </View>
                  <View className='todo-item-content'>
                    <Text className='todo-item-text todo-item-text-completed'>{item.content}</Text>
                    <Text className='todo-item-time'>完成于 {item.completedAt || item.updatedAt}</Text>
                  </View>
                </View>
                <View className='todo-item-delete' onClick={() => { void handleDelete(item) }}>
                  <Text className='todo-item-delete-text'>删除</Text>
                </View>
              </View>
            )) : (
              <View className='todo-empty-inline-card'>
                <Text className='todo-empty-title'>还没有已完成事项</Text>
                <Text className='todo-empty-desc'>完成后的事项会自动归档到这里。</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  )
}

export default TodoPage
