import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import {
  EmploymentDashboardData,
  EmploymentModuleKey,
  JobPosting,
  RecruitmentEvent,
  ResumeProfile,
} from '../../types'
import './index.scss'

type DashboardResult = {
  success?: boolean
  message?: string
  data?: EmploymentDashboardData
}

type ListResult<T> = {
  success?: boolean
  message?: string
  data?: {
    list?: T[]
  }
}

type ToggleFavoriteResult = {
  success?: boolean
  message?: string
  data?: {
    isFollowed?: boolean
  }
}

const moduleMetaMap: Record<EmploymentModuleKey, { title: string; description: string }> = {
  jobs: {
    title: '在招岗位',
    description: '',
  },
  events: {
    title: '招聘活动',
    description: '可关注近期招聘会、直播带岗和线上活动，已结束活动会自动排到后面。',
  },
  resume: {
    title: '个人简历',
    description: '',
  },
  applications: {
    title: '关注的岗位',
    description: '这里展示你已关注的岗位，方便后续持续跟进。',
  },
}

const validModuleTypes: EmploymentModuleKey[] = ['jobs', 'events', 'resume', 'applications']

const isValidModuleType = (value?: string): value is EmploymentModuleKey => {
  return !!value && validModuleTypes.includes(value as EmploymentModuleKey)
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const previewResumePdf = async () => {
  const res = await Taro.cloud.callFunction({
    name: 'generateEmploymentResumePdf',
  })
  const result = res.result as any

  if (!result || !result.success || !result.data || !result.data.tempFileURL) {
    throw new Error(result && result.message ? result.message : '生成 PDF 失败')
  }

  const downloadRes = await Taro.downloadFile({
    url: result.data.tempFileURL,
  })

  if (downloadRes.statusCode !== 200 || !downloadRes.tempFilePath) {
    throw new Error('下载 PDF 失败')
  }

  await Taro.openDocument({
    filePath: downloadRes.tempFilePath,
    fileType: 'pdf',
    showMenu: true,
  })
}

const EmploymentModuleDetail = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const typeParam = router && router.params ? router.params.type : undefined
  const moduleType = isValidModuleType(typeParam) ? typeParam : undefined

  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [jobList, setJobList] = useState<JobPosting[]>([])
  const [eventList, setEventList] = useState<RecruitmentEvent[]>([])
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null)
  const [favoriteJobList, setFavoriteJobList] = useState<JobPosting[]>([])
  const [togglingId, setTogglingId] = useState('')

  useEffect(() => {
    if (moduleType) {
      Taro.setNavigationBarTitle({
        title: moduleMetaMap[moduleType].title,
      })
    }
  }, [moduleType])

  const loadDetailData = async () => {
    if (!moduleType) {
      setLoading(false)
      setErrorText('未找到对应模块')
      return
    }

    setLoading(true)
    setErrorText('')

    try {
      if (moduleType === 'jobs') {
        const jobsRes = await Taro.cloud.callFunction({
          name: 'getEmploymentJobs',
          data: {
            page: 1,
            pageSize: 20,
          },
        })

        const jobsResult = jobsRes.result as ListResult<JobPosting>
        if (!jobsResult || !jobsResult.success || !jobsResult.data) {
          throw new Error(jobsResult && jobsResult.message ? jobsResult.message : '获取岗位数据失败')
        }

        setJobList(jobsResult.data.list || [])
      }

      if (moduleType === 'events') {
        const eventsRes = await Taro.cloud.callFunction({
          name: 'getEmploymentEvents',
          data: {
            page: 1,
            pageSize: 20,
          },
        })

        const eventsResult = eventsRes.result as ListResult<RecruitmentEvent>
        if (!eventsResult || !eventsResult.success || !eventsResult.data) {
          throw new Error(eventsResult && eventsResult.message ? eventsResult.message : '获取招聘活动失败')
        }

        setEventList(eventsResult.data.list || [])
      }

      if (moduleType === 'resume' || moduleType === 'applications') {
        const dashboardRes = await Taro.cloud.callFunction({
          name: 'getEmploymentData',
        })
        const dashboardResult = dashboardRes.result as DashboardResult

        if (!dashboardResult || !dashboardResult.success || !dashboardResult.data) {
          throw new Error(dashboardResult && dashboardResult.message ? dashboardResult.message : '获取数据失败')
        }

        setResumeProfile(dashboardResult.data.resumeProfile)
        setFavoriteJobList(dashboardResult.data.followedJobs || [])
      }
    } catch (error) {
      console.error('加载就业服务详情失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetailData()
  }, [moduleType])

  const toggleFavorite = async (targetType: 'job' | 'event', targetId: string) => {
    setTogglingId(targetId)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'toggleEmploymentFavorite',
        data: {
          targetType,
          targetId,
        },
      })
      const result = res.result as ToggleFavoriteResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '操作失败')
      }

      Taro.showToast({
        title: result.message || '操作成功',
        icon: 'none',
      })

      await loadDetailData()
    } catch (error) {
      console.error('切换关注失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setTogglingId('')
    }
  }

  const navigateToJobDetail = (jobId?: string) => {
    if (!jobId) {
      return
    }

    Taro.navigateTo({
      url: `/pages/Employment/page/JobDetail/index?jobId=${jobId}`,
    })
  }

  const handleResumeAction = () => {
    void navigateToResumeEditor()
  }

  const navigateToResumeEditor = async () => {
    try {
      const res = await Taro.cloud.callFunction({ name: 'getUserProfile' })
      const result = res.result as any
      const userInfo = result && result.success ? (result.data || {}) : {}
      const realName = `${userInfo.real_name || userInfo.realName || ''}`.trim()

      if (!realName) {
        const modalRes = await Taro.showModal({
          title: '请先完善认证信息',
          content: '进入个人简历前，需要先完成真实姓名等身份信息填写。',
          confirmText: '去认证',
          cancelText: '稍后',
        })

        if (modalRes.confirm) {
          Taro.navigateTo({ url: '/pages/VeteranAuth/index' })
        }
        return
      }

      Taro.navigateTo({ url: '/pages/Employment/page/ResumeEditor/index' })
    } catch (error) {
      console.error('校验认证信息失败', error)
      Taro.showToast({ title: '暂时无法进入简历页', icon: 'none' })
    }
  }

  const handleResumeDownload = async () => {
    if (!resumeProfile) {
      Taro.showToast({ title: '请先完善简历', icon: 'none' })
      return
    }

    try {
      Taro.showLoading({ title: '生成 PDF...' })
      await previewResumePdf()
    } catch (error) {
      console.error('导出简历失败', error)
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  if (!moduleType) {
    return (
      <View className='employment-detail-page employment-detail-status-page'>
        <View className='employment-detail-status-card'>
          <Text className='employment-detail-status-title'>未找到对应模块</Text>
          <Text className='employment-detail-status-desc'>请返回就业服务首页重新进入。</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='employment-detail-page'>
      <View className={`employment-detail-header ${moduleType === 'events' || moduleType === 'jobs' || moduleType === 'resume' ? 'employment-detail-header-plain' : ''}`}>
        <Text className='employment-detail-title'>{moduleMetaMap[moduleType].title}</Text>
        {moduleMetaMap[moduleType].description ? <Text className='employment-detail-desc'>{moduleMetaMap[moduleType].description}</Text> : null}
      </View>

      {loading && (
        <LightLoading text='正在获取对应模块内容...' />
      )}

      {!loading && errorText && (
        <View className='employment-detail-status-card employment-detail-status-card-error' onClick={loadDetailData}>
          <Text className='employment-detail-status-title'>加载失败</Text>
          <Text className='employment-detail-status-desc'>{errorText}</Text>
          <Text className='employment-detail-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && moduleType === 'jobs' && (
        <View className='employment-detail-list'>
          {jobList.length > 0 ? (
            jobList.map((job) => {
              const jobId = job._id || job.id || ''
              const isFollowed = !!job.isFollowed
              const isToggling = jobId !== '' && togglingId === jobId

              return (
                <View
                  key={job._id || job.id || job.jobName}
                  className='employment-detail-card employment-detail-job-card'
                  onClick={() => navigateToJobDetail(jobId)}
                >
                  <View className='employment-detail-card-top'>
                    <View className='employment-detail-card-main'>
                      <Text className='employment-detail-card-title'>{job.jobName}</Text>
                      <Text className='employment-detail-card-subtitle'>{job.companyName}</Text>
                    </View>
                    <View className='employment-detail-salary-box'>
                      <Text className='employment-detail-salary-text'>{job.salaryMin}-{job.salaryMax}</Text>
                      <Text className='employment-detail-salary-unit'>元/{job.salaryUnit}</Text>
                    </View>
                  </View>

                  <View className='employment-detail-chip-row'>
                    <Text className='employment-detail-chip employment-detail-chip-muted'>{job.city} · {job.district}</Text>
                    <Text className='employment-detail-chip employment-detail-chip-muted'>{job.employmentNature || job.employmentType}</Text>
                    <Text className='employment-detail-chip employment-detail-chip-muted'>{job.education}</Text>
                    <Text className='employment-detail-chip employment-detail-chip-muted'>{job.experience}</Text>
                  </View>

                  <View className='employment-detail-chip-row'>
                    {job.tags.map((tag) => (
                      <Text key={`${job._id || job.id || job.jobName}-${tag}`} className='employment-detail-chip employment-detail-chip-accent'>
                        {tag}
                      </Text>
                    ))}
                  </View>

                  <View className='employment-detail-card-foot'>
                    <View className='employment-detail-foot-meta'>
                      <Text className='employment-detail-foot-text'>{job.source}</Text>
                      <Text className='employment-detail-foot-text'>{job.updatedAt}</Text>
                    </View>
                    <View
                      className={`employment-detail-primary-btn ${isFollowed ? 'employment-detail-primary-btn-followed' : ''}`}
                      onClick={(event: any) => {
                        event.stopPropagation()
                        if (!isToggling && jobId) {
                          void toggleFavorite('job', jobId)
                        }
                      }}
                    >
                      <Text className={`employment-detail-primary-btn-text ${isFollowed ? 'employment-detail-primary-btn-text-followed' : ''}`}>
                        {isToggling ? '处理中...' : isFollowed ? '已关注' : '关注'}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            })
          ) : (
            <View className='employment-detail-empty-card'>
              <Text className='employment-detail-empty-title'>当前没有岗位数据</Text>
              <Text className='employment-detail-empty-desc'>可以稍后刷新，或在后台补充岗位数据。</Text>
            </View>
          )}
        </View>
      )}

      {!loading && !errorText && moduleType === 'events' && (
        <View className='employment-detail-list'>
          {eventList.length > 0 ? (
            eventList.map((eventItem) => {
              const eventId = eventItem._id || eventItem.id || ''
              const disabled = eventItem.displayStatus === '已结束'
              const isToggling = eventId !== '' && togglingId === eventId

              return (
                <View key={eventId || eventItem.title} className='employment-detail-card employment-detail-event-card'>
                  <View className='employment-detail-event-head'>
                    <Text className='employment-detail-event-type'>{eventItem.eventType}</Text>
                    <View
                      className={`employment-detail-event-action ${eventItem.displayStatus === '已关注' ? 'employment-detail-event-action-followed' : ''} ${disabled ? 'employment-detail-event-action-ended' : ''}`}
                      onClick={() => {
                        if (!disabled && !isToggling && eventId) {
                          void toggleFavorite('event', eventId)
                        }
                      }}
                    >
                      <Text className={`employment-detail-event-action-text ${disabled ? 'employment-detail-event-action-text-ended' : ''}`}>
                        {isToggling ? '处理中...' : eventItem.displayStatus}
                      </Text>
                    </View>
                  </View>
                  <Text className='employment-detail-card-title'>{eventItem.title}</Text>
                  <Text className='employment-detail-event-meta'>{eventItem.organizer}</Text>
                  <Text className='employment-detail-event-meta'>{eventItem.dateRangeText}</Text>
                  <Text className='employment-detail-event-meta'>{eventItem.address}</Text>
                  {eventItem.livePlatform ? (
                    <Text className='employment-detail-event-meta'>{eventItem.livePlatform} · {eventItem.liveRoomName}</Text>
                  ) : null}
                  <Text className='employment-detail-event-follow'>当前关注 {eventItem.participantCount} 人</Text>
                </View>
              )
            })
          ) : (
            <View className='employment-detail-empty-card'>
              <Text className='employment-detail-empty-title'>当前没有招聘活动</Text>
              <Text className='employment-detail-empty-desc'>可以在云数据库中补充招聘会和直播带岗信息。</Text>
            </View>
          )}
        </View>
      )}

      {!loading && !errorText && moduleType === 'resume' && (
        <>
          {resumeProfile ? (
            <View className='employment-detail-card employment-detail-resume-card'>
              <View className='employment-detail-resume-head'>
                <View>
                  <Text className='employment-detail-resume-name'>{resumeProfile.fullName}</Text>
                  <Text className='employment-detail-resume-target'>{resumeProfile.targetPosition}</Text>
                </View>
                <View className='employment-detail-resume-side'>
                  <Text className='employment-detail-resume-side-title'>最近更新</Text>
                  <Text className='employment-detail-resume-side-value'>{resumeProfile.lastUpdatedAt}</Text>
                </View>
              </View>

              <View className='employment-detail-resume-meta-row'>
                  {resumeProfile.birthDate ? <Text className='employment-detail-resume-meta'>出生年月：{resumeProfile.birthDate}</Text> : null}
                  <Text className='employment-detail-resume-meta'>期望城市：{resumeProfile.targetCity}</Text>
                  {resumeProfile.expectedSalary ? <Text className='employment-detail-resume-meta'>期望薪资：{resumeProfile.expectedSalary}</Text> : null}
                {resumeProfile.phone ? <Text className='employment-detail-resume-meta'>联系电话：{resumeProfile.phone}</Text> : null}
              </View>

              <View className='employment-detail-resume-progress-track'>
                <View
                  className='employment-detail-resume-progress-fill'
                  style={{ width: `${resumeProfile.completeness}%` }}
                />
              </View>
              <Text className='employment-detail-resume-progress-text'>简历完整度 {resumeProfile.completeness}%</Text>

              <View className='employment-detail-chip-row'>
                {(resumeProfile.highlights || []).map((item) => (
                  <Text key={item} className='employment-detail-chip employment-detail-chip-accent'>
                    {item}
                  </Text>
                ))}
              </View>

              {resumeProfile.bio ? (
                <View className='employment-detail-resume-bio-box'>
                  <Text className='employment-detail-resume-bio-title'>个人简介</Text>
                  <Text className='employment-detail-resume-bio-text'>{resumeProfile.bio}</Text>
                </View>
              ) : null}

              {resumeProfile.certificateNames && resumeProfile.certificateNames.length ? (
                <View className='employment-detail-chip-row'>
                  {resumeProfile.certificateNames.map((item) => (
                    <Text key={item} className='employment-detail-chip employment-detail-chip-muted'>{item}</Text>
                  ))}
                </View>
              ) : null}

              <View className='employment-detail-resume-action-row'>
                <View className='employment-detail-primary-btn employment-detail-resume-btn' onClick={handleResumeAction}>
                  <Text className='employment-detail-primary-btn-text'>完善简历</Text>
                </View>
                <View className='employment-detail-secondary-btn employment-detail-resume-btn' onClick={handleResumeDownload}>
                  <Text className='employment-detail-secondary-btn-text'>下载简历</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className='employment-detail-empty-card'>
              <Text className='employment-detail-empty-title'>还没有简历信息</Text>
              <Text className='employment-detail-empty-desc'>请先完成身份认证，再进入简历页完善求职信息。</Text>
              <View className='employment-detail-primary-btn employment-detail-resume-btn' onClick={handleResumeAction}>
                <Text className='employment-detail-primary-btn-text'>去完善简历</Text>
              </View>
            </View>
          )}
        </>
      )}

      {!loading && !errorText && moduleType === 'applications' && (
        <View className='employment-detail-list'>
          {favoriteJobList.length > 0 ? (
            favoriteJobList.map((item) => {
              const jobId = item._id || item.id || ''
              const isToggling = jobId !== '' && togglingId === jobId

              return (
                <View
                  key={jobId || item.jobName}
                  className='employment-detail-card employment-detail-job-card'
                  onClick={() => navigateToJobDetail(jobId)}
                >
                  <View className='employment-detail-card-top'>
                    <View className='employment-detail-card-main'>
                      <Text className='employment-detail-card-title'>{item.jobName}</Text>
                      <Text className='employment-detail-card-subtitle'>{item.companyName}</Text>
                    </View>
                    <View className='employment-detail-inline-tag'>
                      <Text className='employment-detail-inline-tag-text'>已关注</Text>
                    </View>
                  </View>
                  <Text className='employment-detail-event-meta'>{item.workLocation || `${item.city} · ${item.district}`}</Text>
                  <Text className='employment-detail-event-meta'>{item.salaryMin}-{item.salaryMax} 元/{item.salaryUnit}</Text>
                  <View className='employment-detail-card-foot'>
                    <View className='employment-detail-foot-meta'>
                      <Text className='employment-detail-foot-text'>{item.updatedAt}</Text>
                    </View>
                    <View
                      className='employment-detail-secondary-btn'
                      onClick={(event: any) => {
                        event.stopPropagation()
                        if (!isToggling && jobId) {
                          void toggleFavorite('job', jobId)
                        }
                      }}
                    >
                      <Text className='employment-detail-secondary-btn-text'>{isToggling ? '处理中...' : '取消关注'}</Text>
                    </View>
                  </View>
                </View>
              )
            })
          ) : (
            <View className='employment-detail-empty-card'>
              <Text className='employment-detail-empty-title'>暂无关注岗位</Text>
              <Text className='employment-detail-empty-desc'>先去在招岗位中关注感兴趣的岗位，这里会自动展示。</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default EmploymentModuleDetail
