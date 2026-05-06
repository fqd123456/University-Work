export type SoulBlogProfile = {
  _id?: string
  userId: string
  displayName: string
  avatarUrl?: string
  motto: string
  createdAt?: string
  updatedAt?: string
}

export type SoulBlogCategory = {
  _id?: string
  userId: string
  name: string
  sortOrder: number
  articleCount: number
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
}

export type SoulBlogArticle = {
  _id?: string
  userId: string
  title: string
  categoryId: string
  categoryName: string
  summary: string
  contentHtml: string
  plainText: string
  coverImage?: string
  imageList: string[]
  keywords?: string[]
  status?: string
  viewCount?: number
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
}

export type SoulBlogHomeData = {
  profile: SoulBlogProfile
  categories: SoulBlogCategory[]
  recentArticles: SoulBlogArticle[]
  stats: {
    articleCount: number
    categoryCount: number
    totalWords: number
  }
}
