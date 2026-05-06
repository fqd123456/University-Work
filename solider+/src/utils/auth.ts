import Taro from '@tarojs/taro'

const LOGIN_PAGE_URL = '/pages/Login/index'

const PROTECTED_PAGE_PATHS = [
  '/pages/SoulBlog/index',
  '/pages/Health/index',
  '/pages/Medals/index',
  '/pages/Employment/index',
  '/pages/Entrepreneurship/index',
  '/pages/EducationTraining/index',
  '/pages/Todo/index',
]

type StoredUser = {
  isLogin?: boolean
  is_login?: boolean
  data?: {
    isLogin?: boolean
    is_login?: boolean
  }
}

type EnsureLoginOptions = {
  redirect?: boolean
  showToast?: boolean
}

const normalizeIsLogin = (value: StoredUser | null | undefined) => {
  if (!value) {
    return false
  }

  if (typeof value.isLogin === 'boolean') {
    return value.isLogin
  }

  if (value.is_login === true) {
    return true
  }

  const nestedData = value.data
  if (nestedData && typeof nestedData.isLogin === 'boolean') {
    return nestedData.isLogin
  }

  return nestedData ? nestedData.is_login === true : false
}

export const getStoredUser = () => {
  const currentUser = Taro.getStorageSync('currentUser') as StoredUser | null
  return currentUser || null
}

export const isLoggedIn = () => {
  if (Taro.getStorageSync('skipLogin')) {
    return false
  }

  return normalizeIsLogin(getStoredUser())
}

export const isProtectedPagePath = (pagePath?: string) => {
  if (!pagePath) {
    return false
  }

  return PROTECTED_PAGE_PATHS.some((protectedPath) => pagePath.indexOf(protectedPath) === 0)
}

export const redirectToLogin = (redirect = false) => {
  if (redirect) {
    Taro.redirectTo({ url: LOGIN_PAGE_URL })
    return
  }

  Taro.navigateTo({ url: LOGIN_PAGE_URL })
}

export const ensureLoggedIn = (options: EnsureLoginOptions = {}) => {
  const { redirect = false, showToast = true } = options

  if (isLoggedIn()) {
    return true
  }

  if (showToast) {
    Taro.showToast({
      title: '请先登录后再使用',
      icon: 'none',
    })
  }

  redirectToLogin(redirect)
  return false
}

export const ensureProtectedPageAccess = (pagePath?: string, options: EnsureLoginOptions = {}) => {
  if (!isProtectedPagePath(pagePath)) {
    return true
  }

  return ensureLoggedIn(options)
}
