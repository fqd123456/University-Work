import Taro from '@tarojs/taro'
import annualReviewIcon from '../../assets/service-icons/annual_review.png'
import benefitsCardIcon from '../../assets/service-icons/benefits_card.png'
import educationTrainingIcon from '../../assets/service-icons/education_training.png'
import employmentServiceIcon from '../../assets/service-icons/employment_service.png'
import entrepreneurshipSupportIcon from '../../assets/service-icons/entrepreneurship_support.png'
import healthManagementIcon from '../../assets/service-icons/health_management.png'
import martyrsDirectoryIcon from '../../assets/service-icons/martyrs_directory.png'
import memorialFacilityIcon from '../../assets/service-icons/memorial_facility.png'
import moreServicesIcon from '../../assets/service-icons/more_services.png'
import personalMedalIcon from '../../assets/service-icons/personal_medal.png'
import soulBlogIcon from '../../assets/service-icons/soul_blog.png'

export type ServiceItem = {
  image: string
  value: string
  pagePath?: string
}

const RECENT_SERVICE_STORAGE_KEY = 'recent_service_records'
const MAX_RECENT_SERVICE_COUNT = 20
const HOME_SERVICE_DISPLAY_COUNT = 8

type RecentServiceRecord = {
  key: string
  count: number
  lastClickedAt: number
}

const getServiceKey = (item: ServiceItem) => {
  return item.pagePath || item.value
}

const normalizeRecentRecords = (value: unknown): RecentServiceRecord[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const key = `${item}`.trim()

        return key
          ? {
            key,
            count: 1,
            lastClickedAt: 0,
          }
          : null
      }

      if (!item || typeof item !== 'object') {
        return null
      }

      const current = item as Partial<RecentServiceRecord>
      const key = current.key ? `${current.key}`.trim() : ''
      const count = Number(current.count || 0)
      const lastClickedAt = Number(current.lastClickedAt || 0)

      if (!key) {
        return null
      }

      return {
        key,
        count: Number.isNaN(count) || count <= 0 ? 1 : count,
        lastClickedAt: Number.isNaN(lastClickedAt) || lastClickedAt <= 0 ? 0 : lastClickedAt,
      }
    })
    .filter(Boolean) as RecentServiceRecord[]
}

export const employmentData =
  [
    {
      image: employmentServiceIcon,
      value: '就业服务',
      pagePath: '/pages/Employment/index'
    },
    {
      image: entrepreneurshipSupportIcon,
      value: '创业扶持',
      pagePath: '/pages/Entrepreneurship/index'
    },
    {
      image: educationTrainingIcon,
      value: '教育培训',
      pagePath: '/pages/EducationTraining/index'
    },
  ]
export const personalDevData =
  [
    {
      image: healthManagementIcon,
      value: '健康管理',
      pagePath: '/pages/Health/index'
    },
    {
      image: soulBlogIcon,
      value: '军魂记录',
      pagePath: '/pages/SoulBlog/index'
    },
    {
      image: personalMedalIcon,
      value: '个人勋章',
      pagePath: '/pages/Medals/index'
    },
  ]
export const militaryRetireData =
  [
    {
      image: annualReviewIcon,
      value: '逐月领取退役金退役军人年审',
      pagePath: '/pages/AnnualReview/index?type=monthly-pension'
    },
    {
      image: annualReviewIcon,
      value: '自主择业军转干部年审',
      pagePath: '/pages/AnnualReview/index?type=self-employed-cadre'
    },
    {
      image: annualReviewIcon,
      value: '军休干部年审',
      pagePath: '/pages/AnnualReview/index?type=retired-cadre'
    },
    {
      image: annualReviewIcon,
      value: '无军籍退休职工年审',
      pagePath: '/pages/AnnualReview/index?type=non-military-retired'
    },
    {
      image: annualReviewIcon,
      value: '企业军转干部年审',
      pagePath: '/pages/AnnualReview/index?type=enterprise-transfer-cadre'
    },
  ]
export const veteransSupportData =
  [
    {
      image: benefitsCardIcon,
      value: '优待证网上申请',
      pagePath: '/pages/BenefitsCardApply/index'
    },
    {
      image: martyrsDirectoryIcon,
      value: '烈士英名录查询',
      pagePath: '/pages/MartyrsDirectory/index'
    },
    {
      image: memorialFacilityIcon,
      value: '烈士纪念设施查询',
      pagePath: '/pages/MemorialFacilities/index'
    },
  ]

export const homeServiceData: ServiceItem[] =
  [
    ...employmentData,
    ...personalDevData.filter((item) => item.pagePath),
    ...militaryRetireData,
    ...veteransSupportData,
    {
      image: moreServicesIcon,
      value: '查看更多'
    },
  ]

export const getSearchableServiceItems = () => {
  return homeServiceData.filter((item) => !!item.pagePath)
}

export const searchServiceItems = (keyword: string) => {
  const normalizedKeyword = `${keyword || ''}`.trim().toLowerCase()

  if (!normalizedKeyword) {
    return []
  }

  return getSearchableServiceItems().filter((item) => {
    return `${item.value || ''}`.toLowerCase().includes(normalizedKeyword)
  })
}

export const recordRecentService = (item: ServiceItem) => {
  if (!item || !item.pagePath) {
    return
  }

  const serviceKey = getServiceKey(item)
  const now = Date.now()
  const currentRecords = normalizeRecentRecords(Taro.getStorageSync(RECENT_SERVICE_STORAGE_KEY))
  const existedRecord = currentRecords.find((record) => record.key === serviceKey)
  const nextRecords = [
    {
      key: serviceKey,
      count: existedRecord ? existedRecord.count + 1 : 1,
      lastClickedAt: now,
    },
  ]
    .concat(currentRecords.filter((record) => record.key !== serviceKey))
    .slice(0, MAX_RECENT_SERVICE_COUNT)

  Taro.setStorageSync(RECENT_SERVICE_STORAGE_KEY, nextRecords)
  console.log('[recent-service] recordRecentService', {
    clicked: item.value,
    serviceKey,
    nextRecords,
  })
}

export const getRecentHomeServices = () => {
  const recentRecords = normalizeRecentRecords(Taro.getStorageSync(RECENT_SERVICE_STORAGE_KEY))
  const moreItem = homeServiceData.find((item) => !item.pagePath) || null
  const normalItems = homeServiceData.filter((item) => !!item.pagePath)
  const serviceMap = normalItems.reduce<Record<string, ServiceItem>>((result, item) => {
    result[getServiceKey(item)] = item
    return result
  }, {})

  const recentItems = recentRecords
    .sort((left, right) => {
      if (left.lastClickedAt !== right.lastClickedAt) {
        return right.lastClickedAt - left.lastClickedAt
      }

      return right.count - left.count
    })
    .map((record) => serviceMap[record.key])
    .filter(Boolean)

  const usedKeys = recentItems.map((item) => getServiceKey(item))
  const remainingItems = normalItems.filter((item) => !usedKeys.includes(getServiceKey(item)))
  const nextItems = recentItems.concat(remainingItems).slice(0, HOME_SERVICE_DISPLAY_COUNT - (moreItem ? 1 : 0))

  if (moreItem) {
    nextItems.push(moreItem)
  }

  console.log('[recent-service] getRecentHomeServices', {
    recentRecords,
    nextItems: nextItems.map((item) => ({
      value: item.value,
      pagePath: item.pagePath || '',
    })),
  })

  return nextItems
}
