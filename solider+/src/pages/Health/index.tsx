import { Canvas, Image, Input, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../components/LightLoading'
import { ensureLoggedIn } from '../../utils/auth'
import { HealthDashboard, HealthLog, HealthProfile } from './types'
import './index.scss'

type HealthDashboardResult = {
  success?: boolean
  message?: string
  data?: HealthDashboard
}

type SaveHealthLogResult = {
  success?: boolean
  message?: string
}

type UpdateHealthGoalResult = {
  success?: boolean
  message?: string
}

type ClearHealthLogsResult = {
  success?: boolean
  message?: string
  data?: {
    removedCount?: number
  }
}

type ChartPoint = {
  x: number
  y: number
}

const systemInfo = Taro.getSystemInfoSync()
const windowWidth = systemInfo.windowWidth || 375
const rpxToPx = (value: number) => (windowWidth / 750) * value
const chartWidth = Math.max(windowWidth - rpxToPx(144), 220)
const chartHeight = rpxToPx(240)
const chartPadding = {
  left: rpxToPx(10),
  right: rpxToPx(10),
  top: rpxToPx(18),
  bottom: rpxToPx(18),
}

const initialProfile: HealthProfile = {
  userId: '',
  displayName: '退役军人',
  roleLabel: '退役军人',
  avatarUrl: '',
  heightCm: 0,
  latestWeightKg: 0,
  goalWeightKg: 0,
  bmi: 0,
}

const initialDashboard: HealthDashboard = {
  profile: initialProfile,
  logs: [],
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const getInitials = (value: string) => {
  const nextValue = `${value || ''}`.trim()

  if (!nextValue) {
    return 'A'
  }

  return nextValue.slice(0, 1).toUpperCase()
}

const getMonthLabel = (value: string, recordedAt?: string) => {
  const nextValue = `${value || ''}`.trim()
  const monthMap: Record<string, string> = {
    jan: '1月',
    feb: '2月',
    mar: '3月',
    apr: '4月',
    may: '5月',
    jun: '6月',
    jul: '7月',
    aug: '8月',
    sep: '9月',
    oct: '10月',
    nov: '11月',
    dec: '12月',
  }

  if (nextValue.endsWith('月')) {
    return nextValue
  }

  const lowerValue = nextValue.toLowerCase()
  if (monthMap[lowerValue]) {
    return monthMap[lowerValue]
  }

  if (/^\d{1,2}$/.test(nextValue)) {
    return `${Number(nextValue)}月`
  }

  const monthFromYearMonth = nextValue.match(/^\d{4}[-/](\d{1,2})$/)
  if (monthFromYearMonth && monthFromYearMonth[1]) {
    return `${Number(monthFromYearMonth[1])}月`
  }

  const dateSource = `${recordedAt || ''}`.trim()
  const monthFromDate = dateSource.match(/^\d{4}-(\d{2})-\d{2}$/)
  if (monthFromDate && monthFromDate[1]) {
    return `${Number(monthFromDate[1])}月`
  }

  return nextValue
}

const uniqueMonthLabels = (logs: HealthLog[]) => {
  const nextLabels: string[] = []

  logs.forEach((item) => {
    const monthLabel = getMonthLabel(item.recordedMonthLabel, item.recordedAt)
    if (monthLabel && !nextLabels.includes(monthLabel)) {
      nextLabels.push(monthLabel)
    }
  })

  return nextLabels
}

const getWeightAxisLabels = (logs: HealthLog[]) => {
  if (!logs.length) {
    return ['90', '85', '80']
  }

  const weights = logs.map((item) => item.weightKg)
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const top = Math.ceil(maxWeight + 1)
  const bottom = Math.floor(minWeight - 1)
  const middle = Number(((top + bottom) / 2).toFixed(1))

  return [`${top}`, `${middle}`, `${bottom}`]
}

const Health = () => {
  const [dashboard, setDashboard] = useState<HealthDashboard>(initialDashboard)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [goalWeightInput, setGoalWeightInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [goalSaving, setGoalSaving] = useState(false)
  const [clearingLogs, setClearingLogs] = useState(false)
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])
  const [authorized, setAuthorized] = useState(false)

  const clearChartCanvas = () => {
    const ctx = Taro.createCanvasContext('healthWeightChart')
    ctx.clearRect(0, 0, chartWidth, chartHeight)
    ctx.draw()
    setChartPoints([])
  }

  const loadDashboard = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getHealthDashboard',
      })
      const result = res.result as HealthDashboardResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取健康管理数据失败')
      }

      setDashboard(result.data)
    } catch (error) {
      console.error('加载健康管理数据失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    const passed = ensureLoggedIn({ redirect: true })
    setAuthorized(passed)

    if (!passed) {
      setDashboard(initialDashboard)
      setWeightInput('')
      setGoalWeightInput('')
      setShowEditor(false)
      setShowGoalEditor(false)
      clearChartCanvas()
      setLoading(false)
      setErrorText('')
    }
  })

  useEffect(() => {
    if (!authorized) {
      return
    }

    void loadDashboard()
  }, [authorized])

  useEffect(() => {
    if (loading || errorText) {
      return
    }

    if (!dashboard.logs.length) {
      setChartPoints([])
      return
    }

    const timer = setTimeout(() => {
      const logs = dashboard.logs
      const weights = logs.map((item) => item.weightKg)
      const minWeight = Math.min(...weights)
      const maxWeight = Math.max(...weights)
      const safeMin = minWeight - 1
      const safeMax = maxWeight + 1
      const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right
      const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom

      const points = logs.map((item, index) => {
        const x = chartPadding.left + (logs.length === 1 ? chartInnerWidth / 2 : (chartInnerWidth / (logs.length - 1)) * index)
        const y = chartPadding.top + (safeMax === safeMin
          ? chartInnerHeight / 2
          : ((safeMax - item.weightKg) / (safeMax - safeMin)) * chartInnerHeight)

        return { x, y }
      })

      const ctx = Taro.createCanvasContext('healthWeightChart')
      ctx.clearRect(0, 0, chartWidth, chartHeight)
      ctx.setStrokeStyle('#4DD0C0')
      ctx.setLineWidth(4)
      ctx.setLineCap('round')
      ctx.setLineJoin('round')

      points.forEach((point, index) => {
        if (index === 0) {
          ctx.beginPath()
          ctx.moveTo(point.x, point.y)
        } else {
          ctx.lineTo(point.x, point.y)
        }
      })
      ctx.stroke()

      points.forEach((point, index) => {
        if (index === points.length - 1) {
          return
        }

        ctx.beginPath()
        ctx.setFillStyle('#4DD0C0')
        ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.draw()
      setChartPoints(points)
    }, 40)

    return () => clearTimeout(timer)
  }, [dashboard.logs, errorText, loading])

  const handleSaveWeight = async () => {
    const nextWeight = Number(weightInput)

    if (!nextWeight || Number.isNaN(nextWeight)) {
      Taro.showToast({
        title: '请输入有效体重',
        icon: 'none',
      })
      return
    }

    setSaving(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'saveHealthLog',
        data: {
          weightKg: nextWeight,
        }
      })

      const result = res.result as SaveHealthLogResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '保存体重失败')
      }

      Taro.showToast({
        title: '记录成功',
        icon: 'success',
      })

      setWeightInput('')
      setShowEditor(false)
      setShowGoalEditor(false)
      await loadDashboard()
    } catch (error) {
      console.error('保存健康记录失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveGoalWeight = async () => {
    const nextGoalWeight = Number(goalWeightInput)

    if (!nextGoalWeight || Number.isNaN(nextGoalWeight) || nextGoalWeight < 20 || nextGoalWeight > 300) {
      Taro.showToast({
        title: '请输入有效目标体重',
        icon: 'none',
      })
      return
    }

    setGoalSaving(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'updateHealthGoal',
        data: {
          goalWeightKg: nextGoalWeight,
        }
      })

      const result = res.result as UpdateHealthGoalResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '更新目标体重失败')
      }

      Taro.showToast({
        title: '目标已更新',
        icon: 'success',
      })

      setGoalWeightInput('')
      setShowGoalEditor(false)
      await loadDashboard()
    } catch (error) {
      console.error('更新目标体重失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setGoalSaving(false)
    }
  }

  const handleClearLogs = async () => {
    if (!dashboard.logs.length) {
      Taro.showToast({
        title: '暂无可清空记录',
        icon: 'none',
      })
      return
    }

    const modalRes = await Taro.showModal({
      title: '清空记录曲线',
      content: '清空后历史体重曲线将被删除，但当前体重和目标体重会保留。',
      confirmText: '确认清空',
      cancelText: '先不清空',
      confirmColor: '#ef4444',
    })

    if (!modalRes.confirm) {
      return
    }

    setClearingLogs(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'clearHealthLogs',
      })

      const result = res.result as ClearHealthLogsResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '清空健康记录失败')
      }

      clearChartCanvas()
      setShowEditor(false)
      setShowGoalEditor(false)
      Taro.showToast({
        title: '记录已清空',
        icon: 'success',
      })
      await loadDashboard()
    } catch (error) {
      console.error('清空健康记录失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setClearingLogs(false)
    }
  }

  const profile = dashboard.profile || initialProfile
  const latestPoint = chartPoints.length ? chartPoints[chartPoints.length - 1] : null
  const monthLabels = uniqueMonthLabels(dashboard.logs)
  const axisLabels = getWeightAxisLabels(dashboard.logs)
  const openGoalEditor = () => {
    setShowEditor(false)
    setGoalWeightInput(profile.goalWeightKg ? `${profile.goalWeightKg}` : '')
    setShowGoalEditor(true)
  }

  if (!authorized) {
    return <View className='health-page' />
  }

  return (
    <View className='health-page'>
      {loading && (
        <LightLoading text='正在获取你的健康数据...' />
      )}

      {!loading && errorText && (
        <View className='health-status-card health-status-card-error' onClick={loadDashboard}>
          <Text className='health-status-title'>加载失败</Text>
          <Text className='health-status-desc'>{errorText}</Text>
          <Text className='health-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <View className='health-card'>
          <View className='health-avatar-wrap'>
            <View className='health-avatar-ring'>
              {profile.avatarUrl ? (
                <Image className='health-avatar-image' src={profile.avatarUrl} mode='aspectFill' />
              ) : (
                <View className='health-avatar-fallback'>
                  <Text className='health-avatar-fallback-text'>{getInitials(profile.displayName)}</Text>
                </View>
              )}
            </View>
          </View>

          <Text className='health-name'>{profile.displayName}</Text>
          <Text className='health-role'>2002年4月</Text>
          {/* <Text className='health-role'>{getBirthDateLabel(profile.birthDate)}</Text> */}

          <View className='health-mini-metrics'>
            <View className='health-mini-metric'>
              <Text className='health-mini-metric-value'>{profile.heightCm} cm</Text>
              <Text className='health-mini-metric-label'>身高</Text>
            </View>
            <View className='health-mini-metric'>
              <Text className='health-mini-metric-value'>{profile.bmi}</Text>
              <Text className='health-mini-metric-label'>BMI</Text>
            </View>
          </View>

          <View className='health-main-metrics'>
            <View className='health-main-metric'>
              <Text className='health-main-metric-value'>{profile.latestWeightKg} kg</Text>
              <Text className='health-main-metric-label'>当前体重</Text>
            </View>
            <View className='health-main-divider' />
            <View className='health-main-metric'>
              <Text className='health-main-metric-value'>{profile.goalWeightKg} kg</Text>
              <Text className='health-main-metric-label'>目标体重</Text>
            </View>
          </View>

          <View className='health-secondary-actions'>
            <View className='health-secondary-action' onClick={openGoalEditor}>
              <Text className='health-secondary-action-text'>修改目标体重</Text>
            </View>
            <View className='health-secondary-action health-secondary-action-danger' onClick={() => !clearingLogs && void handleClearLogs()}>
              <Text className='health-secondary-action-text health-secondary-action-text-danger'>{clearingLogs ? '清空中...' : '清空记录曲线'}</Text>
            </View>
          </View>

          <View className='health-chart-section'>
            <View className='health-chart-axis health-chart-axis-top'>
              <Text className='health-chart-axis-label'>{axisLabels[0]}</Text>
              <View className='health-chart-grid-line' />
            </View>
            <View className='health-chart-axis health-chart-axis-mid'>
              <Text className='health-chart-axis-label'>{axisLabels[1]}</Text>
              <View className='health-chart-grid-line' />
            </View>
            <View className='health-chart-axis health-chart-axis-bottom'>
              <Text className='health-chart-axis-label'>{axisLabels[2]}</Text>
              <View className='health-chart-grid-line' />
            </View>

            <View className='health-chart-canvas-wrap' style={{ height: `${chartHeight}px` }}>
              {dashboard.logs.length ? (
                <>
                  <Canvas
                    canvasId='healthWeightChart'
                    className='health-chart-canvas'
                    width={String(chartWidth)}
                    height={String(chartHeight)}
                    style={{ width: `${chartWidth}px`, height: `${chartHeight}px` }}
                  />
                  {latestPoint ? (
                    <View
                      className='health-chart-highlight'
                      style={{
                        left: `${latestPoint.x - 12}px`,
                        top: `${latestPoint.y - 12}px`,
                      }}
                    >
                      <View className='health-chart-highlight-dot' />
                    </View>
                  ) : null}
                </>
              ) : (
                <View className='health-chart-empty'>
                  <Text className='health-chart-empty-title'>暂无体重记录</Text>
                  <Text className='health-chart-empty-desc'>记录一次体重后，这里会生成你的变化曲线</Text>
                </View>
              )}
            </View>

            {monthLabels.length ? (
              <View className='health-chart-months'>
                {monthLabels.map((item) => (
                  <Text key={item} className='health-chart-month-label'>{item}</Text>
                ))}
              </View>
            ) : null}
          </View>

          <View
            className='health-log-button'
            onClick={() => {
              setShowGoalEditor(false)
              setShowEditor((value) => !value)
            }}
          >
            <Text className='health-log-button-text'>记录体重</Text>
          </View>

          {showEditor ? (
            <View className='health-editor-card'>
              <Text className='health-editor-title'>记录今日体重</Text>
              <Input
                className='health-editor-input'
                type='digit'
                placeholder='请输入今日体重，例如 83.6'
                value={weightInput}
                onInput={(event) => setWeightInput(event.detail.value)}
              />
              <View className='health-editor-actions'>
                <View className='health-editor-btn health-editor-btn-secondary' onClick={() => setShowEditor(false)}>
                  <Text className='health-editor-btn-secondary-text'>取消</Text>
                </View>
                <View className='health-editor-btn health-editor-btn-primary' onClick={() => !saving && void handleSaveWeight()}>
                  <Text className='health-editor-btn-primary-text'>{saving ? '保存中...' : '保存记录'}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {showGoalEditor ? (
            <View className='health-editor-card'>
              <Text className='health-editor-title'>修改目标体重</Text>
              <Input
                className='health-editor-input'
                type='digit'
                placeholder='请输入目标体重，例如 78'
                value={goalWeightInput}
                onInput={(event) => setGoalWeightInput(event.detail.value)}
              />
              <View className='health-editor-actions'>
                <View className='health-editor-btn health-editor-btn-secondary' onClick={() => setShowGoalEditor(false)}>
                  <Text className='health-editor-btn-secondary-text'>取消</Text>
                </View>
                <View className='health-editor-btn health-editor-btn-primary' onClick={() => !goalSaving && void handleSaveGoalWeight()}>
                  <Text className='health-editor-btn-primary-text'>{goalSaving ? '保存中...' : '保存目标'}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}

export default Health
