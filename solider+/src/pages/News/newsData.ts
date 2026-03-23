export type NewsTabKey = 'info' | 'media' | 'policy' | 'local'

export type NewsItem = {
  id: string
  tab: NewsTabKey
  title: string
  time: string
  source: string
  content: string[]
  url?: string
}

export const newsTabs: { key: NewsTabKey; label: string }[] = [
  { key: 'info', label: '新闻资讯' },
  { key: 'media', label: '媒体报道' },
  { key: 'policy', label: '政策解读' },
  { key: 'local', label: '地方动态' },
]

export const NEWS_LIST_CACHE_KEY = 'newsListCache'
export const NEWS_CURRENT_ITEM_KEY = 'newsCurrentItem'
export const NEWS_DETAIL_CACHE_KEY = 'newsDetailCache'

const isNewsTabKey = (value: any): value is NewsTabKey => {
  return newsTabs.some(tab => tab.key === value)
}

const normalizeContent = (value: any) => {
  if (!Array.isArray(value)) return []
  return value
    .map(item => `${item || ''}`.trim())
    .filter(Boolean)
}

export const normalizeNewsItem = (raw: any): NewsItem | null => {
  if (!raw || !isNewsTabKey(raw.tab)) return null

  return {
    id: `${raw.id || ''}`.trim(),
    tab: raw.tab,
    title: `${raw.title || ''}`.trim(),
    time: `${raw.time || ''}`.trim(),
    source: `${raw.source || ''}`.trim(),
    content: normalizeContent(raw.content),
    url: raw.url ? `${raw.url}`.trim() : undefined,
  }
}
