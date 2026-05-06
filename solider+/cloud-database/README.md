# 云数据库设计说明

当前项目里已经有这些业务数据：

1. 新闻资讯
2. 就业服务
3. 教育培训
4. 创业扶持与地区化配置
5. 退伍指引个人进度与健康管理
6. 待办事项

为了后续扩展方便，建议继续按“业务集合拆分 + 地区配置单独维护”的方式来做。

## 待办事项集合

这次新增的待办事项功能建议单独使用一个集合：

1. `user_todos`

### 为什么单独建表

- 待办事项属于用户自己的动态数据，不适合直接塞进 `users` 表
- 一位用户会有多条待办，需要支持新增、完成、删除和历史保留
- 后续如果你要扩展优先级、提醒时间、分类标签，单独建表更方便

### `user_todos`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 待办主键 |
| `userId` | string | 用户 OPENID |
| `content` | string | 待办内容 |
| `isCompleted` | boolean | 是否已完成 |
| `isDeleted` | boolean | 是否已删除 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |
| `completedAt` | string | 完成时间 |

### 待办事项云函数

1. `getTodoList`
2. `saveTodoItem`
3. `toggleTodoItem`
4. `deleteTodoItem`

## 导入格式说明

微信云开发控制台导入 JSON 时，要求的是 `JSON Lines` 格式，不是标准 JSON 数组。

也就是：

- `cloud-database/*.json`：普通 JSON 数组版本，方便你查看和维护
- `cloud-database/jsonl/*.json`：可直接导入微信云数据库的版本，一行一条记录

错误示例：

```json
[
  { "a": 1 },
  { "a": 2 }
]
```

正确示例：

```json
{ "a": 1 }
{ "a": 2 }
```

## 零、新闻资讯集合

当前新闻页里的“新闻资讯 / 媒体报道 / 政策解读 / 地方动态”仍由 `getNewsData` 云函数动态拉取政府公开资讯源。

如果要新增“退役专栏”并保证内容稳定，建议单独增加一个云数据库集合：

1. `news_veteran_articles`

这样做的好处：

- 退役专栏内容可以人工维护，稳定性高
- 不依赖第三方网页结构变化
- 详情正文可以直接存数据库，不需要再次抓取网页
- 后续如果你要加封面图、置顶、专题标签，也容易扩展

### `news_veteran_articles`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 文章主键 |
| `title` | string | 标题 |
| `source` | string | 来源 |
| `publishedAt` | string | 发布时间 |
| `content` | string[] | 正文段落数组 |
| `isTop` | boolean | 是否置顶 |
| `isPublished` | boolean | 是否发布 |
| `updatedAt` | string | 更新时间 |

### 新闻资讯接入方式

- `getNewsData` 继续拉取现有公开资讯源
- 同时从 `news_veteran_articles` 读取“退役专栏”数据
- 新闻页新增 `退役专栏` tab
- 退役专栏详情直接读取数据库中的 `content`

## 一、就业服务集合

### 推荐集合

1. `employment_companies`
2. `employment_jobs`
3. `employment_events`
4. `employment_profiles`
5. `employment_applications`
6. `employment_favorites`

### 集合关系

- `employment_companies._id` -> `employment_jobs.companyId`
- `employment_jobs._id` -> `employment_applications.jobId`
- `employment_companies._id` -> `employment_applications.companyId`
- `employment_profiles.userId` -> 当前登录用户 `OPENID`
- `employment_applications.userId` -> 当前登录用户 `OPENID`
- `employment_favorites.userId` -> 当前登录用户 `OPENID`
- `employment_favorites.targetId` -> `employment_jobs._id` 或 `employment_events._id`

### 集合用途

#### `employment_companies`

企业基础信息。一家公司可以对应多个岗位。

#### `employment_jobs`

岗位信息。页面岗位查询、推荐岗位和岗位详情主要读取这个集合。

建议在岗位表中直接补齐详情字段，不需要再单独拆一张“岗位详情表”，这样列表页和详情页都能复用同一份岗位数据。

#### `employment_events`

招聘活动。线下招聘会、线上招聘会、直播带岗都放这里。

#### `employment_profiles`

用户简历。一位用户通常对应一份简历，使用 `userId` 关联微信 `OPENID`。

#### `employment_applications`

应聘记录。一个用户可以对应多条投递记录。

#### `employment_favorites`

用户关注记录。用于存储“关注的岗位”和“关注的招聘活动”。

相比把关注状态直接写回岗位表或活动表，单独建表更适合按用户查询，也方便后续扩展提醒、备注等能力。

### 就业服务云函数

1. `getEmploymentData`
2. `getEmploymentJobs`
3. `getEmploymentEvents`
4. `saveEmploymentProfile`
5. `createEmploymentApplication`
6. `toggleEmploymentFavorite`
7. `getEmploymentJobDetail`

## 教育培训集合

这次新增的教育培训功能建议使用下面 4 个集合：

1. `regional_training_policies`
2. `training_providers`
3. `training_programs`
4. `user_training_registrations`

### 为什么这样拆

#### `regional_training_policies`

专门存地区培训政策说明。

首页要展示“免培训费、证书考评、就业推荐”等政策内容，这类信息不属于某一个课程或某一个机构，更适合按地区单独维护。

#### `training_providers`

专门存培训机构信息。

一个培训机构可以承办多个培训项目，所以不建议把机构信息完全写死在课程表里。

#### `training_programs`

专门存每一期具体培训项目。

课程标题、报名人数、报名时间、培训岗位、培训内容、考核标准这些都属于项目级数据，应该单独建表。

#### `user_training_registrations`

专门存用户自己的培训报名和培训状态。

不建议把培训状态直接放进 `users` 表，原因是：

- 一个用户可能参加多次培训
- 培训状态会随着时间变化，需要保留历史记录
- 后续还可能增加审核备注、结业备注、证书信息等字段
- 独立成表后，按用户查询状态、按课程查询报名记录都更方便

### 集合关系

- `training_providers._id` -> `training_programs.providerId`
- `training_programs._id` -> `user_training_registrations.programId`
- `user_training_registrations.userId` -> 当前登录用户 `OPENID`
- `regional_training_policies.regionId` -> `training_programs.regionId`

### 字段设计

#### `regional_training_policies`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 建议直接使用 `regionId` |
| `regionId` | string | 地区 ID |
| `regionName` | string | 地区名称 |
| `province` | string | 省 |
| `city` | string | 市 |
| `policyTitle` | string | 政策标题 |
| `policySummary` | string | 政策简介 |
| `policyHighlights` | string[] | 政策亮点 |
| `supportItems` | array | 细分政策项 |
| `notice` | string | 温馨提示 |
| `updatedAt` | string | 更新时间 |

`supportItems` 每项建议包含：

- `title`
- `desc`

#### `training_providers`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 机构主键 |
| `regionId` | string | 地区 ID |
| `regionName` | string | 地区名称 |
| `province` | string | 省 |
| `city` | string | 市 |
| `district` | string | 区县 |
| `providerName` | string | 培训机构名称 |
| `providerType` | string | 机构类型 |
| `address` | string | 地址 |
| `latitude` | number | 纬度 |
| `longitude` | number | 经度 |
| `contactName` | string | 联系人 |
| `contactPhone` | string | 联系电话 |
| `intro` | string | 机构简介 |
| `specialties` | string[] | 擅长方向 |
| `isActive` | boolean | 是否启用 |
| `updatedAt` | string | 更新时间 |

#### `training_programs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 培训项目主键 |
| `regionId` | string | 地区 ID |
| `regionName` | string | 地区名称 |
| `province` | string | 省 |
| `city` | string | 市 |
| `district` | string | 区县 |
| `providerId` | string | 承办机构 ID |
| `providerName` | string | 承办机构名称 |
| `title` | string | 培训标题 |
| `summary` | string | 简介 |
| `enrolledCount` | number | 已报名人数 |
| `capacity` | number | 招收人数 |
| `address` | string | 培训地点 |
| `category` | string | 培训类别 |
| `positions` | string[] | 培训岗位 |
| `programStatus` | string | 课程状态 |
| `trainingStartAt` | string | 培训开始时间 |
| `trainingEndAt` | string | 培训结束时间 |
| `registrationStartAt` | string | 报名开始时间 |
| `registrationEndAt` | string | 报名截止时间 |
| `approvalAgency` | string | 审核机构 |
| `contactName` | string | 联系人 |
| `contactPhone` | string | 联系电话 |
| `certificateAvailable` | boolean | 是否取得证书 |
| `certificateName` | string | 证书名称 |
| `certificateLevel` | string | 证书等级 |
| `trainingGoal` | string | 培训目的 |
| `trainingContent` | string | 培训内容 |
| `assessmentStandard` | string | 考核标准 |
| `isRecommended` | boolean | 是否推荐 |
| `isActive` | boolean | 是否启用 |
| `updatedAt` | string | 更新时间 |

#### `user_training_registrations`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 报名记录主键 |
| `userId` | string | 用户 `OPENID` |
| `programId` | string | 培训项目 ID |
| `providerId` | string | 培训机构 ID |
| `regionId` | string | 地区 ID |
| `title` | string | 培训标题快照 |
| `providerName` | string | 机构名称快照 |
| `category` | string | 培训类别 |
| `address` | string | 培训地址快照 |
| `stage` | string | 审核中 / 培训中 / 已结业 / 未通过 |
| `registeredAt` | string | 报名时间 |
| `updatedAt` | string | 最近更新时间 |
| `trainingStartAt` | string | 培训开始时间 |
| `trainingEndAt` | string | 培训结束时间 |
| `certificateAvailable` | boolean | 是否含证书 |
| `certificateName` | string | 证书名称 |
| `certificateLevel` | string | 证书等级 |
| `auditNote` | string | 审核说明 |
| `completionNote` | string | 结业备注 |

### 教育培训云函数

1. `getEducationTrainingHomeData`
获取首页政策、推荐课程和当前用户培训状态摘要。

2. `getTrainingPrograms`
获取当前地区培训报名页的课程列表。

3. `getTrainingProgramDetail`
获取培训详情页需要的课程、机构和当前用户报名状态。

4. `createTrainingRegistration`
提交培训报名并生成个人培训记录。

5. `getTrainingRegistrations`
获取当前用户的培训状态列表。

## 二、创业扶持集合

这次新增的创业扶持功能建议使用下面 3 个集合：

1. `entrepreneurship_companies`
2. `regional_entrepreneurship_offices`
3. `regional_veteran_guides`

### 为什么这样拆

#### `entrepreneurship_companies`

专门存“优创传帮带”的优秀退役军人创业公司。

一家公司一条记录，便于做列表、详情页、展示页和后续导师推荐。

#### `regional_entrepreneurship_offices`

专门存“当地创业办公室”。

这个集合以地区为主键更合适，也就是 `_id` 直接用 `regionId`，比如 `jx_fuzhou`。

这样你的页面可以直接按地区查本地创业办公室，不需要再手动做复杂筛选。

#### `regional_veteran_guides`

专门存“退伍指引步骤”的地区化配置。

同样建议一条地区配置对应一个文档，`_id = regionId`，文档中用 `steps` 数组存该地区的退伍指引步骤。

这样未来不同地区的办理顺序、地点、材料不同，也能单独维护。

### 字段设计

#### `entrepreneurship_companies`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 企业主键 |
| `regionId` | string | 所属地区 ID |
| `regionName` | string | 所属地区名称 |
| `companyName` | string | 企业名称 |
| `founderName` | string | 创始人姓名 |
| `founderTitle` | string | 创始人身份或头衔 |
| `contactName` | string | 联系人 |
| `contactPhone` | string | 联系电话 |
| `address` | string | 地址 |
| `latitude` | number | 纬度 |
| `longitude` | number | 经度 |
| `industry` | string | 行业 |
| `establishedAt` | string | 成立时间 |
| `initialInvestment` | string | 资金投入 |
| `currentStage` | string | 当前发展阶段 |
| `teamSize` | string | 团队规模 |
| `annualRevenue` | string | 营收情况 |
| `intro` | string | 企业介绍 |
| `mentorshipDirection` | string | 传帮带方向 |
| `futurePlan` | string | 后续规划 |
| `tags` | string[] | 标签 |
| `supportHighlights` | string[] | 可提供的帮助亮点 |
| `isFeatured` | boolean | 是否精选展示 |
| `isActive` | boolean | 是否启用 |
| `updatedAt` | string | 更新时间 |

#### `regional_entrepreneurship_offices`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 直接使用地区 ID |
| `regionId` | string | 地区 ID |
| `regionName` | string | 地区名称 |
| `province` | string | 省 |
| `city` | string | 市 |
| `district` | string | 区县，可为空 |
| `officeName` | string | 办公室名称 |
| `contactName` | string | 联系人 |
| `contactPhone` | string | 电话 |
| `officeHours` | string | 工作时间 |
| `address` | string | 地址 |
| `latitude` | number | 纬度 |
| `longitude` | number | 经度 |
| `serviceScope` | string[] | 服务范围 |
| `materials` | string[] | 建议携带材料 |
| `policyTips` | string[] | 创业咨询提示 |
| `updatedAt` | string | 更新时间 |

#### `regional_veteran_guides`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 直接使用地区 ID |
| `regionId` | string | 地区 ID |
| `regionName` | string | 地区名称 |
| `updatedAt` | string | 更新时间 |
| `steps` | array | 该地区退伍指引步骤数组 |

`steps` 数组中每一项建议包含：

- `id`
- `title`
- `desc`
- `summary`
- `locationName`
- `address`
- `latitude`
- `longitude`
- `materials`
- `buttonText`

## 三、创业扶持云函数

这次已经补好下面 3 个云函数：

1. `getEntrepreneurshipData`
按地区获取创业扶持首页数据，返回创业公司列表和本地创业办公室。

2. `getEntrepreneurshipDetail`
获取创业公司详情或创业办公室详情。

3. `getRegionalGuideSteps`
按地区获取退伍指引步骤，为后续把首页退伍指引改成地区化读取做准备。

## 四、个人进度与健康管理集合

### 退伍指引个人进度为什么不要直接写到 `users` 表

不建议把“退伍指引完成步骤”直接塞到 `users` 表里。

更合适的做法是单独建一个集合：

1. `user_guide_progress`

原因：

- 这是独立业务域，不应该和用户基础资料强耦合
- 后续可能存在“同一用户在不同地区查看不同退伍指引”的情况
- 后续如果要加完成时间、最近办理步骤、材料补充说明，独立表更容易扩展
- 避免 `users` 文档越来越大，更新也更容易冲突

### 推荐集合：`user_guide_progress`

建议一条记录对应“一个用户在一个地区的退伍指引进度”。

字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 记录主键 |
| `userId` | string | 用户 `OPENID` |
| `regionId` | string | 地区 ID |
| `completedStepIds` | string[] | 已完成的步骤 ID |
| `updatedAt` | string | 最后更新时间 |

### 健康管理推荐集合

健康管理建议拆成两张表：

1. `user_health_profiles`
2. `user_health_logs`

不要只建一张表的原因：

- 用户当前档案和历史曲线是两种不同粒度的数据
- 一位用户只有一份健康档案，但会有多条体重记录
- 做曲线图、最近趋势和后续按时间筛选时，两表结构更清晰

### `user_health_profiles`

一位用户一份健康档案。

字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 主键 |
| `userId` | string | 用户 `OPENID` |
| `displayName` | string | 展示名称 |
| `roleLabel` | string | 角色文案 |
| `avatarUrl` | string | 头像 |
| `heightCm` | number | 身高 |
| `latestWeightKg` | number | 当前体重 |
| `goalWeightKg` | number | 目标体重 |
| `bmi` | number | BMI |
| `updatedAt` | string | 更新时间 |

### `user_health_logs`

用户体重历史记录，用来绘制曲线图。

字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 记录主键 |
| `userId` | string | 用户 `OPENID` |
| `weightKg` | number | 记录时体重 |
| `recordedAt` | string | 记录日期 |
| `recordedMonthLabel` | string | 月份标签 |
| `heightCmSnapshot` | number | 当次记录时身高快照 |
| `bmi` | number | 当次 BMI |

### 新增云函数

这次补好的函数有：

1. `getGuideProgress`
获取用户当前地区的退伍指引完成进度。

2. `saveGuideProgress`
保存用户完成的退伍指引步骤。

3. `getHealthDashboard`
获取健康管理页的档案信息和体重曲线数据。

4. `saveHealthLog`
保存用户新的体重记录，并同步更新 BMI 和当前体重。

## 五、军魂记录集合

军魂记录建议单独拆成 3 个集合：

1. `user_blog_profiles`
2. `user_blog_categories`
3. `user_blog_articles`

这样做的原因：

- 用户主页信息、分类、文章正文属于三种不同粒度的数据
- 分类会被多篇文章复用，不适合直接塞进文章正文里维护
- 后续如果要做草稿、置顶、点赞、评论、公开广场，也更容易扩展

### `user_blog_profiles`

一位用户一条记录，主要存头像展示信息和座右铭。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 主键 |
| `userId` | string | 用户 `OPENID` |
| `displayName` | string | 展示昵称 |
| `avatarUrl` | string | 头像 |
| `motto` | string | 个人座右铭 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### `user_blog_categories`

用户自己的文章分类。默认建议创建 `生活`、`运动` 两个分类。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 分类主键 |
| `userId` | string | 用户 `OPENID` |
| `name` | string | 分类名称 |
| `sortOrder` | number | 排序值 |
| `articleCount` | number | 当前分类文章数 |
| `isDefault` | boolean | 是否默认分类 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### `user_blog_articles`

文章正文与搜索内容。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 文章主键 |
| `userId` | string | 用户 `OPENID` |
| `title` | string | 文章标题 |
| `categoryId` | string | 分类 ID |
| `categoryName` | string | 分类名称快照 |
| `summary` | string | 列表摘要 |
| `contentHtml` | string | 富文本 HTML 内容 |
| `plainText` | string | 纯文本内容，便于搜索 |
| `coverImage` | string | 封面图 |
| `imageList` | string[] | 文章中使用的图片列表 |
| `keywords` | string[] | 关键词 |
| `status` | string | 发布状态，当前可用 `published` |
| `viewCount` | number | 浏览次数 |
| `publishedAt` | string | 发布时间 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### 军魂记录云函数

建议使用下面这些函数：

1. `getSoulBlogHomeData`
获取军魂记录首页数据，包括用户资料、分类和最近文章。

2. `getSoulBlogArticles`
按关键词或分类查询文章列表。

3. `getSoulBlogArticleDetail`
获取单篇文章详情。

4. `saveSoulBlogArticle`
新增或编辑文章。

5. `deleteSoulBlogArticle`
删除文章。

6. `saveSoulBlogProfile`
保存个人座右铭。

7. `saveSoulBlogCategory`
新增或更新文章分类。

## 六、烈士英名录与纪念设施集合

烈士英名录和烈士纪念设施不建议混用一张业务表。

更合理的做法是：

1. `regional_directory_regions`
2. `regional_martyrs_directory`
3. `regional_memorial_facilities`

这样设计的原因：

- “地址联级”属于共享基础数据，英名录和纪念设施都可以复用
- 烈士名录和纪念设施字段差异很大，混在一张业务表里后续维护会很乱
- 分开后查询、详情页字段、索引和扩展方向都更清晰

### `regional_directory_regions`

这张表专门存“省 / 市 / 区县 / regionId”的联级配置。

英名录查询和纪念设施查询都可以共用这一张地区表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 地区主键，建议等于 `regionId` |
| `regionId` | string | 地区 ID |
| `regionName` | string | 地区名称 |
| `province` | string | 省 |
| `city` | string | 市 |
| `districts` | array | 区县数组 |
| `sortOrder` | number | 城市排序 |
| `updatedAt` | string | 更新时间 |

`districts` 数组中每项建议包含：

- `label`
- `district`
- `regionId`

### `regional_martyrs_directory`

一条文档对应一位烈士，使用 `regionId` 标识所属地区。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 烈士主键 |
| `regionId` | string | 地区 ID |
| `regionName` | string | 地区名称 |
| `province` | string | 省 |
| `city` | string | 市 |
| `district` | string | 区县 |
| `name` | string | 烈士姓名 |
| `gender` | string | 性别 |
| `birthDate` | string | 出生时间 |
| `sacrificeDate` | string | 牺牲时间 |
| `lifespan` | string | 在世时间展示文案 |
| `nativePlace` | string | 籍贯 |
| `address` | string | 地址展示文案 |
| `serviceUnit` | string | 生前所属单位 |
| `position` | string | 生前职务 |
| `sacrificePlace` | string | 牺牲地点 |
| `memorialSite` | string | 纪念地点 |
| `lifeStory` | string | 生前情况 |
| `sacrificeSituation` | string | 牺牲情况 |
| `heroicStory` | string | 烈士事迹 |
| `tags` | string[] | 标签 |
| `searchKeywords` | string[] | 搜索辅助关键词 |
| `updatedAt` | string | 更新时间 |

### 烈士英名录云函数

建议使用下面这些函数：

1. `getMartyrDirectoryHomeData`
按当前 `regionId` 获取搜索首页需要的本地烈士名单。

2. `searchMartyrDirectory`
按姓名关键词、地区、区县等条件查询结果列表。

3. `getMartyrDirectoryDetail`
获取单位烈士的详情信息。

### `regional_memorial_facilities`

一条文档对应一处烈士纪念设施。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 设施主键 |
| `regionId` | string | 地区 ID |
| `regionName` | string | 地区名称 |
| `province` | string | 省 |
| `city` | string | 市 |
| `district` | string | 区县 |
| `facilityName` | string | 设施名称 |
| `facilityType` | string | 设施类型 |
| `address` | string | 详细地址 |
| `locationLabel` | string | 卡片展示位置文案 |
| `latitude` | number | 纬度 |
| `longitude` | number | 经度 |
| `coverImage` | string | 封面图 |
| `imageList` | string[] | 详情页图片列表 |
| `intro` | string | 设施简介 |
| `history` | string | 设施沿革 |
| `openHours` | string | 开放时间 |
| `tags` | string[] | 标签 |
| `isFeatured` | boolean | 是否重点展示 |
| `updatedAt` | string | 更新时间 |

### 烈士纪念设施云函数

建议使用下面这些函数：

1. `getMemorialFacilitiesHomeData`
按当前 `regionId` 获取首页需要的本地纪念设施列表。

2. `searchMemorialFacilities`
按设施名称关键词、地区、区县等条件查询结果列表。

3. `getMemorialFacilityDetail`
获取单处纪念设施详情。

### 地域联级查询建议

因为页面要做“省 / 市 / 区县”三级联动，而当前项目里的 `locationStore` 只保存城市名，所以建议统一使用 `regional_directory_regions` 维护地区联级配置，将：

- 当前城市
- 手动选择的省市区
- 云数据库中的 `regionId`

统一映射起来。

这次页面已按这个思路完成，英名录和纪念设施都共用同一套地区联级配置：

- 当前城市会自动落到对应 `regionId`
- 联级选择会带上 `province / city / district / regionId` 一起查询
- 两个功能页都可以复用同一个地区配置集合和同一个地区云函数

## 七、页面接入情况

### 创业扶持页面

- 服务页里的“创业扶持”已接入新页面
- 首页常用服务里的“创业扶持”也已接入
- 创业扶持页包含两个模块：
  - 优创传帮带
  - 创业咨询
- 点击创业公司进入详情页
- 点击创业办公室进入详情页
- 点击 AI 创业咨询跳转到 AI 咨询页

### 地区化准备

- 创业办公室数据已经按地区主键设计
- 退伍指引步骤的数据结构也已经改成“按地区一条配置文档”的方式准备好了
- 当前退伍指引前端仍沿用本地配置；如果你下一步要切到云数据库，可以直接接 `getRegionalGuideSteps`

### 教育培训页面

- 服务页里的“教育培训”已接入新页面
- 首页展示当前定位、培训政策、培训报名和培训状态两个模块
- 培训报名页展示当前城市的课程卡片，点击进入课程详情
- 培训详情页支持查看课程信息、机构信息、培训内容，并可直接报名
- 培训状态页按“审核中 / 培训中 / 已结业 / 未通过”展示个人培训记录

### 新闻资讯页面

- 新闻页新增 `退役专栏` tab
- “退役专栏”由云数据库 `news_veteran_articles` 提供内容
- 其他 tab 仍保持现有动态资讯抓取方式
- `getNewsData` 已改为“动态资讯 + 退役专栏数据库”混合返回

### 健康管理页面

- 服务页“健康管理”已接入新页面
- 页面展示头像、身高、当前体重、目标体重、BMI 和体重变化曲线
- “Log Weight” 按钮会写入云数据库并刷新曲线
- 当前曲线使用 `user_health_logs` 数据绘制

### 军魂记录页面

- 服务页“军魂记录”已接入新页面
- 首页支持搜索、发布文章、修改个人座右铭
- 支持按分类查看文章
- 支持文章详情查看、编辑、删除
- 发布页支持富文本编辑、图片上传和新增分类

### 烈士英名录页面

- 服务页“烈士英名录查询”已接入新页面
- 首页支持姓名关键词查询、地区联级选择和当前地理位置展示
- 查询卡片下方展示当前地区全部烈士名录
- 查询结果页展示符合条件的烈士卡片
- 详情页展示生前情况、牺牲情况和烈士事迹

### 烈士纪念设施页面

- 服务页“烈士纪念设施查询”已接入新页面
- 首页交互与烈士英名录保持一致，支持名称查询、地区联级选择和当前地理位置展示
- 当前地区设施卡片改为两列排布，卡片包含图片、设施名称和位置
- 点击卡片进入详情页，查看地址、标签、设施图片、简介和沿革
- 英名录与纪念设施共用一套地区联级配置

## 八、推荐索引

建议在微信云开发控制台里增加这些索引：

### 就业服务

- `employment_profiles.userId`
- `employment_applications.userId + updatedAt`
- `employment_applications.userId + jobId`
- `employment_jobs.isActive + updatedAt`
- `employment_jobs.isRecommended + isActive + updatedAt`
- `employment_jobs.city + isActive + updatedAt`
- `employment_events.status + startAt`
- `employment_events.city + startAt`

### 新闻资讯

- `news_veteran_articles.isPublished + publishedAt`
- `news_veteran_articles.isTop + publishedAt`

### 创业扶持

- `entrepreneurship_companies.regionId + isActive + updatedAt`
- `entrepreneurship_companies.regionId + isFeatured + updatedAt`
- `regional_entrepreneurship_offices.regionId`
- `regional_veteran_guides.regionId`

### 教育培训

- `regional_training_policies.regionId`
- `training_providers.regionId + isActive + updatedAt`
- `training_programs.regionId + isActive + updatedAt`
- `training_programs.regionId + isRecommended + updatedAt`
- `training_programs.providerId + updatedAt`
- `user_training_registrations.userId + updatedAt`
- `user_training_registrations.userId + regionId + updatedAt`
- `user_training_registrations.userId + programId`

### 退伍指引个人进度与健康管理

- `user_guide_progress.userId + regionId`
- `user_health_profiles.userId`
- `user_health_logs.userId + recordedAt`

### 军魂记录

- `user_blog_profiles.userId`
- `user_blog_categories.userId + sortOrder`
- `user_blog_categories.userId + name`
- `user_blog_articles.userId + updatedAt`
- `user_blog_articles.userId + categoryId + updatedAt`

### 烈士英名录

- `regional_directory_regions.province + city`
- `regional_directory_regions.regionId`
- `regional_martyrs_directory.regionId + sacrificeDate`
- `regional_martyrs_directory.regionId + district + sacrificeDate`
- `regional_martyrs_directory.name + regionId`
- `regional_martyrs_directory.city + district`

### 烈士纪念设施

- `regional_memorial_facilities.regionId + updatedAt`
- `regional_memorial_facilities.regionId + district + updatedAt`
- `regional_memorial_facilities.facilityName + regionId`
- `regional_memorial_facilities.city + district`

## 九、导入顺序

建议按这个顺序导入：

1. `jsonl/employment_companies.json`
2. `jsonl/news_veteran_articles.json`
3. `jsonl/employment_jobs.json`
4. `jsonl/employment_events.json`
5. `jsonl/employment_profiles.json`
6. `jsonl/employment_applications.json`
7. `jsonl/regional_training_policies.json`
8. `jsonl/training_providers.json`
9. `jsonl/training_programs.json`
10. `jsonl/user_training_registrations.json`
11. `jsonl/entrepreneurship_companies.json`
12. `jsonl/regional_entrepreneurship_offices.json`
13. `jsonl/regional_veteran_guides.json`
14. `jsonl/user_guide_progress.json`
15. `jsonl/user_health_profiles.json`
16. `jsonl/user_health_logs.json`
17. `jsonl/user_blog_profiles.json`
18. `jsonl/user_blog_categories.json`
19. `jsonl/user_blog_articles.json`
20. `jsonl/regional_directory_regions.json`
21. `jsonl/regional_martyrs_directory.json`
22. `jsonl/regional_memorial_facilities.json`

## 十、部署步骤

1. 在微信开发者工具云开发控制台创建以下集合：
   - `news_veteran_articles`
   - `employment_companies`
   - `employment_jobs`
   - `employment_events`
   - `employment_profiles`
   - `employment_applications`
   - `regional_training_policies`
   - `training_providers`
   - `training_programs`
   - `user_training_registrations`
   - `entrepreneurship_companies`
   - `regional_entrepreneurship_offices`
   - `regional_veteran_guides`
   - `user_guide_progress`
   - `user_health_profiles`
   - `user_health_logs`
   - `user_blog_profiles`
   - `user_blog_categories`
   - `user_blog_articles`
   - `regional_directory_regions`
   - `regional_martyrs_directory`
   - `regional_memorial_facilities`
2. 将 `cloud-database/jsonl` 目录中的对应文件导入对应集合。
3. 上传并部署以下云函数：
   - `getNewsData`
   - `getEmploymentData`
   - `getEmploymentJobs`
   - `getEmploymentEvents`
   - `saveEmploymentProfile`
   - `createEmploymentApplication`
   - `getEducationTrainingHomeData`
   - `getTrainingPrograms`
   - `getTrainingProgramDetail`
   - `createTrainingRegistration`
   - `getTrainingRegistrations`
   - `getEntrepreneurshipData`
   - `getEntrepreneurshipDetail`
   - `getRegionalGuideSteps`
   - `getGuideProgress`
   - `saveGuideProgress`
   - `getHealthDashboard`
   - `saveHealthLog`
   - `getSoulBlogHomeData`
   - `getSoulBlogArticles`
   - `getSoulBlogArticleDetail`
   - `saveSoulBlogArticle`
   - `deleteSoulBlogArticle`
   - `saveSoulBlogProfile`
   - `saveSoulBlogCategory`
   - `getDirectoryRegionOptions`
   - `getMartyrDirectoryHomeData`
   - `searchMartyrDirectory`
   - `getMartyrDirectoryDetail`
   - `getMemorialFacilitiesHomeData`
   - `searchMemorialFacilities`
   - `getMemorialFacilityDetail`
4. 在真机或开发者工具中验证“新闻资讯”“就业服务”“教育培训”“创业扶持”“健康管理”“军魂记录”“烈士英名录查询”和“烈士纪念设施查询”页面。
