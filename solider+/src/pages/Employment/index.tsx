import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../components/LightLoading'
import { ensureLoggedIn } from '../../utils/auth'
import {
  EmploymentDashboardData,
  EmploymentModule,
  EmploymentModuleKey,
  JobPosting,
  RecruitmentEvent,
} from './types'
import './index.scss'

const initialDashboardData: EmploymentDashboardData = {
  modules: [],
  recruitmentEvents: [],
  resumeProfile: null,
  applicationProgressList: [],
  followedJobs: [],
  followedEvents: [],
  recommendedJobs: [],
}

type EmploymentDataResult = {
  success?: boolean
  message?: string
  data?: EmploymentDashboardData
}

const topEntryKeys: EmploymentModuleKey[] = ['jobs', 'events', 'resume']

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const buildMetricSummary = (module?: EmploymentModule) => {
  if (!module) {
    return ''
  }

  if (module.metrics && module.metrics.length) {
    return module.metrics.slice(0, 2).map((metric) => `${metric.label} ${metric.value}`).join(' · ')
  }

  return module.subtitle
}

const ModuleIcon = ({ moduleKey }: { moduleKey: EmploymentModuleKey }) => {
  if (moduleKey === 'jobs') {
    return (
      <View className='employment-entry-icon employment-entry-icon-jobs'>
        <View className='employment-icon-briefcase-handle' />
        <View className='employment-icon-briefcase-body' />
      </View>
    )
  }

  if (moduleKey === 'events') {
    return (
      <View className='employment-entry-icon employment-entry-icon-events'>
        <View className='employment-icon-calendar-ring employment-icon-calendar-ring-left' />
        <View className='employment-icon-calendar-ring employment-icon-calendar-ring-right' />
        <View className='employment-icon-calendar-body' />
        <View className='employment-icon-calendar-dot' />
      </View>
    )
  }

  return (
    <View className='employment-entry-icon employment-entry-icon-resume'>
      <View className='employment-icon-document-body' />
      <View className='employment-icon-document-fold' />
      <View className='employment-icon-document-line employment-icon-document-line-top' />
      <View className='employment-icon-document-line employment-icon-document-line-bottom' />
    </View>
  )
}

const Employment = () => {
  const [dashboardData, setDashboardData] = useState<EmploymentDashboardData>(initialDashboardData)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [authorized, setAuthorized] = useState(false)

  const loadEmploymentData = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getEmploymentData'
      })
      const result = res.result as EmploymentDataResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取就业服务数据失败')
      }

      setDashboardData(result.data)
    } catch (error) {
      console.error('加载就业服务数据失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    const passed = ensureLoggedIn({ redirect: true })
    setAuthorized(passed)

    if (!passed) {
      setDashboardData(initialDashboardData)
      setLoading(false)
      setErrorText('')
    }
  })

  useEffect(() => {
    if (!authorized) {
      return
    }

    void loadEmploymentData()
  }, [authorized])

  const employmentModules = dashboardData.modules || []
  const moduleMap = employmentModules.reduce<Partial<Record<EmploymentModuleKey, EmploymentModule>>>((accumulator, moduleItem) => {
    accumulator[moduleItem.key] = moduleItem
    return accumulator
  }, {})

  const navigateToDetail = (type: EmploymentModuleKey) => {
    Taro.navigateTo({
      url: `/pages/Employment/page/ModuleDetail/index?type=${type}`,
    })
  }

  const goJobDetail = (job: JobPosting) => {
    const jobId = job._id || job.id
    if (!jobId) {
      return
    }

    Taro.navigateTo({
      url: `/pages/Employment/page/JobDetail/index?jobId=${jobId}`,
    })
  }

  const followedJobs = (dashboardData.followedJobs || []).slice(0, 3)
  const followedEvents = (dashboardData.followedEvents || []).slice(0, 3)

  if (!authorized) {
    return <View className='employment-page' />
  }

  return (
    <View className='employment-page'>
      <View className='employment-page-header'>
        <Text className='employment-page-title'>就业服务</Text>
        <Text className='employment-page-subtitle'>岗位、招聘活动与简历能力集中查看</Text>
      </View>

      {loading && (
        <LightLoading text='正在获取就业服务相关信息...' />
      )}

      {!loading && errorText && (
        <View className='employment-status-card employment-status-card-error' onClick={loadEmploymentData}>
          <Text className='employment-status-title'>加载失败</Text>
          <Text className='employment-status-desc'>{errorText}</Text>
          <Text className='employment-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          <View className='employment-entry-grid'>
            {topEntryKeys.map((moduleKey) => {
              const moduleItem = moduleMap[moduleKey]

              if (!moduleItem) {
                return null
              }

              return (
                <View
                  key={moduleItem.id || moduleItem.key}
                  className='employment-entry-card'
                  onClick={() => navigateToDetail(moduleItem.key)}
                >
                  <ModuleIcon moduleKey={moduleItem.key} />
                  <Text className='employment-entry-title'>{moduleItem.title}</Text>
                  <Text className='employment-entry-summary'>{buildMetricSummary(moduleItem)}</Text>
                </View>
              )
            })}
          </View>

          <View className='employment-progress-section'>
            <View className='employment-progress-section-header'>
              <Text className='employment-progress-section-title'>关注的岗位</Text>
              <Text
                className='employment-progress-section-action'
                onClick={() => navigateToDetail('applications')}
              >
                查看更多
              </Text>
            </View>

            {followedJobs.length > 0 ? (
              <View className='employment-focus-list'>
                {followedJobs.map((item) => (
                  <View
                    key={item._id || item.id || item.jobName}
                    className='employment-focus-card'
                    onClick={() => goJobDetail(item)}
                  >
                    <View className='employment-focus-head'>
                      <View className='employment-focus-main'>
                        <Text className='employment-focus-title'>{item.jobName}</Text>
                        <Text className='employment-focus-subtitle'>{item.companyName}</Text>
                      </View>
                      <View className='employment-focus-badge employment-focus-badge-job'>
                        <Text className='employment-focus-badge-text'>已关注</Text>
                      </View>
                    </View>
                    <Text className='employment-focus-meta'>{item.city} · {item.district} · {item.employmentNature || item.employmentType}</Text>
                    <Text className='employment-focus-meta'>{item.salaryMin}-{item.salaryMax} 元/{item.salaryUnit}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View
                className='employment-progress-empty-card'
                onClick={() => navigateToDetail('jobs')}
              >
                <Text className='employment-progress-empty-title'>还没有关注任何岗位</Text>
                <Text className='employment-progress-empty-desc'>去在招岗位里挑几个合适的先关注起来。</Text>
              </View>
            )}
          </View>

          <View className='employment-progress-section employment-progress-section-secondary'>
            <View className='employment-progress-section-header'>
              <Text className='employment-progress-section-title'>关注的招聘活动</Text>
              <Text
                className='employment-progress-section-action'
                onClick={() => navigateToDetail('events')}
              >
                查看更多
              </Text>
            </View>

            {followedEvents.length > 0 ? (
              <View className='employment-focus-list'>
                {followedEvents.map((item: RecruitmentEvent) => (
                  <View
                    key={item._id || item.id || item.title}
                    className='employment-focus-card employment-focus-card-event'
                    onClick={() => navigateToDetail('events')}
                  >
                    <View className='employment-focus-head'>
                      <View className='employment-focus-main'>
                        <Text className='employment-focus-title'>{item.title}</Text>
                        <Text className='employment-focus-subtitle'>{item.organizer}</Text>
                      </View>
                      <View className={`employment-focus-badge ${item.displayStatus === '已结束' ? 'employment-focus-badge-end' : 'employment-focus-badge-job'}`}>
                        <Text className={`employment-focus-badge-text ${item.displayStatus === '已结束' ? 'employment-focus-badge-text-end' : ''}`}>
                          {item.displayStatus}
                        </Text>
                      </View>
                    </View>
                    <Text className='employment-focus-meta'>{item.dateRangeText}</Text>
                    <Text className='employment-focus-meta'>{item.address}</Text>
                    {item.livePlatform ? (
                      <Text className='employment-focus-meta'>{item.livePlatform} · {item.liveRoomName}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View
                className='employment-progress-empty-card'
                onClick={() => navigateToDetail('events')}
              >
                <Text className='employment-progress-empty-title'>还没有关注任何招聘活动</Text>
                <Text className='employment-progress-empty-desc'>先关注近期感兴趣的招聘会或直播带岗活动。</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  )
}

export default Employment
