import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { JobPosting } from '../../types'
import './index.scss'

type JobDetailResult = {
  success?: boolean
  message?: string
  data?: JobPosting
}

type ToggleFavoriteResult = {
  success?: boolean
  message?: string
  data?: {
    isFollowed?: boolean
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const EmploymentJobDetail = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const jobId = router && router.params ? `${router.params.jobId || ''}` : ''

  const [jobDetail, setJobDetail] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [toggling, setToggling] = useState(false)

  const loadDetail = async () => {
    if (!jobId) {
      setLoading(false)
      setErrorText('未获取到岗位编号')
      return
    }

    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getEmploymentJobDetail',
        data: { jobId },
      })
      const result = res.result as JobDetailResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取岗位详情失败')
      }

      setJobDetail(result.data)
      Taro.setNavigationBarTitle({
        title: result.data.jobName || '岗位详情',
      })
    } catch (error) {
      console.error('获取岗位详情失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [jobId])

  const handleCallPhone = () => {
    if (!jobDetail || !jobDetail.contactPhone) {
      Taro.showToast({
        title: '暂无联系电话',
        icon: 'none',
      })
      return
    }

    Taro.makePhoneCall({
      phoneNumber: jobDetail.contactPhone,
    }).catch((error) => {
      console.error('拨打电话失败', error)
    })
  }

  const handleToggleFavorite = async () => {
    if (!jobDetail || toggling || !jobId) {
      return
    }

    setToggling(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'toggleEmploymentFavorite',
        data: {
          targetType: 'job',
          targetId: jobId,
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

      setJobDetail({
        ...jobDetail,
        isFollowed: !!(result.data && result.data.isFollowed),
      })
    } catch (error) {
      console.error('切换关注失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setToggling(false)
    }
  }

  return (
    <View className='employment-job-detail-page'>
      {loading && <LightLoading text='正在加载岗位详情...' />}

      {!loading && errorText && (
        <View className='employment-job-detail-status' onClick={loadDetail}>
          <Text className='employment-job-detail-status-title'>加载失败</Text>
          <Text className='employment-job-detail-status-desc'>{errorText}</Text>
          <Text className='employment-job-detail-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && jobDetail && (
        <>
          <View className='employment-job-detail-card'>
            <View className='employment-job-detail-head'>
              <View className='employment-job-detail-main'>
                <Text className='employment-job-detail-title'>{jobDetail.jobName}</Text>
                <Text className='employment-job-detail-company'>{jobDetail.companyName}</Text>
              </View>
              <View className='employment-job-detail-salary'>
                <Text className='employment-job-detail-salary-value'>{jobDetail.salaryMin}-{jobDetail.salaryMax}</Text>
                <Text className='employment-job-detail-salary-unit'>元/{jobDetail.salaryUnit}</Text>
              </View>
            </View>

            <View className='employment-job-detail-tags'>
              <Text className='employment-job-detail-tag'>{jobDetail.city} · {jobDetail.district}</Text>
              <Text className='employment-job-detail-tag'>{jobDetail.employmentNature || jobDetail.employmentType}</Text>
              <Text className='employment-job-detail-tag'>{jobDetail.education}</Text>
              <Text className='employment-job-detail-tag'>{jobDetail.experience}</Text>
            </View>

            <Text className='employment-job-detail-meta'>工作地点：{jobDetail.workLocation || `${jobDetail.city} ${jobDetail.district}`}</Text>
            <Text className='employment-job-detail-meta'>工作时间：{jobDetail.workSchedule || '以企业安排为准'}</Text>
            <Text className='employment-job-detail-meta'>联系人：{jobDetail.contactName || '企业招聘负责人'}</Text>
            <Text className='employment-job-detail-meta'>联系电话：{jobDetail.contactPhone || '暂无'}</Text>
            <Text className='employment-job-detail-meta'>企业地址：{jobDetail.companyAddress || '暂无'}</Text>

            <View className='employment-job-detail-action-row'>
              <View className='employment-job-detail-primary' onClick={handleToggleFavorite}>
                <Text className='employment-job-detail-primary-text'>{toggling ? '处理中...' : (jobDetail.isFollowed ? '已关注' : '关注岗位')}</Text>
              </View>
              <View className='employment-job-detail-secondary' onClick={handleCallPhone}>
                <Text className='employment-job-detail-secondary-text'>一键拨打</Text>
              </View>
            </View>
          </View>

          <View className='employment-job-detail-card'>
            <Text className='employment-job-detail-section-title'>岗位要求</Text>
            {(jobDetail.requirements || []).map((item) => (
              <Text key={item} className='employment-job-detail-paragraph'>- {item}</Text>
            ))}
          </View>

          <View className='employment-job-detail-card'>
            <Text className='employment-job-detail-section-title'>工作安排</Text>
            {(jobDetail.responsibilities || []).map((item) => (
              <Text key={item} className='employment-job-detail-paragraph'>- {item}</Text>
            ))}
          </View>

          <View className='employment-job-detail-card'>
            <Text className='employment-job-detail-section-title'>福利制度</Text>
            {(jobDetail.benefits || []).map((item) => (
              <Text key={item} className='employment-job-detail-paragraph'>- {item}</Text>
            ))}
          </View>

          {jobDetail.jobDescription ? (
            <View className='employment-job-detail-card'>
              <Text className='employment-job-detail-section-title'>岗位说明</Text>
              <Text className='employment-job-detail-paragraph employment-job-detail-paragraph-block'>{jobDetail.jobDescription}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  )
}

export default EmploymentJobDetail
