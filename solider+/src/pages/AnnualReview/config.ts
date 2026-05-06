export type AnnualReviewFieldOption = {
  label: string
  value: string
}

export type AnnualReviewField = {
  id: string
  label: string
  type: 'text' | 'idcard' | 'phone' | 'number' | 'textarea' | 'picker' | 'date'
  placeholder: string
  required: boolean
  options?: AnnualReviewFieldOption[]
  initialValue?: string
}

export type AnnualReviewConfig = {
  id: string
  title: string
  shortTitle: string
  description: string
  statusText: string
  submitText: string
  tipList: string[]
  fields: AnnualReviewField[]
}

const yearOptions: AnnualReviewFieldOption[] = [
  { label: '2026年度', value: '2026' },
  { label: '2025年度', value: '2025' },
  { label: '2024年度', value: '2024' },
]

export const annualReviewConfigs: AnnualReviewConfig[] = [
  {
    id: 'monthly-pension',
    title: '逐月领取退役金退役军人年审',
    shortTitle: '逐月退役金年审',
    description: '核验个人基本信息、领取状态及现居住情况，确保退役金发放资格连续有效。',
    statusText: '年度核验中',
    submitText: '提交逐月退役金年审',
    tipList: [
      '请确保身份证号、联系电话与系统留存信息一致。',
      '异地居住人员请如实填写现居住地址，必要时按属地要求补充证明。',
      '提交后预计 1-3 个工作日完成审核。'
    ],
    fields: [
      { id: 'name', label: '姓名', type: 'text', placeholder: '请输入姓名', required: true },
      { id: 'idNumber', label: '身份证号', type: 'idcard', placeholder: '请输入身份证号', required: true },
      { id: 'reviewYear', label: '年审年度', type: 'picker', placeholder: '请选择年审年度', required: true, options: yearOptions, initialValue: '2026' },
      { id: 'contactPhone', label: '联系电话', type: 'phone', placeholder: '请输入联系电话', required: true },
      { id: 'bankAccount', label: '领取银行卡号', type: 'number', placeholder: '请输入银行卡号', required: true },
      { id: 'livingStatus', label: '居住状态', type: 'picker', placeholder: '请选择居住状态', required: true, options: [
        { label: '本地常住', value: 'local' },
        { label: '异地常住', value: 'outside' },
        { label: '临时外出', value: 'temporary' },
      ] },
      { id: 'currentAddress', label: '现居住地址', type: 'textarea', placeholder: '请输入详细居住地址', required: true },
      { id: 'note', label: '补充说明', type: 'textarea', placeholder: '如有变更信息可补充说明', required: false },
    ]
  },
  {
    id: 'self-employed-cadre',
    title: '自主择业军转干部年审',
    shortTitle: '自主择业年审',
    description: '用于核验自主择业军转干部的安置、就业和联系方式等年度信息。',
    statusText: '资料待更新',
    submitText: '提交自主择业年审',
    tipList: [
      '如工作单位或居住地有变化，请一并更新。',
      '如当前未就业，可在补充说明中填写待业或自主创业情况。',
      '审核通过后，系统会同步更新年审状态。'
    ],
    fields: [
      { id: 'name', label: '姓名', type: 'text', placeholder: '请输入姓名', required: true },
      { id: 'idNumber', label: '身份证号', type: 'idcard', placeholder: '请输入身份证号', required: true },
      { id: 'reviewYear', label: '年审年度', type: 'picker', placeholder: '请选择年审年度', required: true, options: yearOptions, initialValue: '2026' },
      { id: 'resettlementCity', label: '安置地', type: 'text', placeholder: '请输入安置地', required: true },
      { id: 'employmentStatus', label: '当前状态', type: 'picker', placeholder: '请选择当前状态', required: true, options: [
        { label: '在岗就业', value: 'employed' },
        { label: '自主创业', value: 'startup' },
        { label: '待业求职', value: 'seeking' },
      ] },
      { id: 'companyName', label: '现工作单位', type: 'text', placeholder: '请输入工作单位或创业主体', required: false },
      { id: 'contactPhone', label: '联系电话', type: 'phone', placeholder: '请输入联系电话', required: true },
      { id: 'note', label: '补充说明', type: 'textarea', placeholder: '可填写岗位变动、创业情况等', required: false },
    ]
  },
  {
    id: 'retired-cadre',
    title: '军休干部年审',
    shortTitle: '军休干部年审',
    description: '年度核对军休干部基础信息、健康状态、联系地址及服务站管理信息。',
    statusText: '待提交审核',
    submitText: '提交军休干部年审',
    tipList: [
      '如行动不便，可由家属协助填写并在补充说明中备注。',
      '联系地址请尽量填写到门牌号，便于后续服务联系。',
      '必要时请按管理单位要求补交证明材料。'
    ],
    fields: [
      { id: 'name', label: '姓名', type: 'text', placeholder: '请输入姓名', required: true },
      { id: 'idNumber', label: '身份证号', type: 'idcard', placeholder: '请输入身份证号', required: true },
      { id: 'reviewYear', label: '年审年度', type: 'picker', placeholder: '请选择年审年度', required: true, options: yearOptions, initialValue: '2026' },
      { id: 'serviceStation', label: '所属服务机构', type: 'text', placeholder: '请输入军休服务管理机构', required: true },
      { id: 'healthStatus', label: '健康状况', type: 'picker', placeholder: '请选择健康状况', required: true, options: [
        { label: '良好', value: 'good' },
        { label: '需持续就医', value: 'medical' },
        { label: '行动不便', value: 'limited' },
      ] },
      { id: 'contactPhone', label: '联系电话', type: 'phone', placeholder: '请输入联系电话', required: true },
      { id: 'currentAddress', label: '现居住地址', type: 'textarea', placeholder: '请输入现居住地址', required: true },
      { id: 'note', label: '补充说明', type: 'textarea', placeholder: '可填写家属联系人、特殊情况等', required: false },
    ]
  },
  {
    id: 'non-military-retired',
    title: '无军籍退休职工年审',
    shortTitle: '无军籍年审',
    description: '核对无军籍退休职工的身份、联系方式、退休单位及社保状态等信息。',
    statusText: '资料核对中',
    submitText: '提交无军籍年审',
    tipList: [
      '请确认原退休单位、联系方式和社保状态填写准确。',
      '如委托他人代办，可在补充说明中备注代办人信息。',
      '提交后请留意电话或站内消息通知。'
    ],
    fields: [
      { id: 'name', label: '姓名', type: 'text', placeholder: '请输入姓名', required: true },
      { id: 'idNumber', label: '身份证号', type: 'idcard', placeholder: '请输入身份证号', required: true },
      { id: 'reviewYear', label: '年审年度', type: 'picker', placeholder: '请选择年审年度', required: true, options: yearOptions, initialValue: '2026' },
      { id: 'formerUnit', label: '原退休单位', type: 'text', placeholder: '请输入原退休单位', required: true },
      { id: 'socialSecurityStatus', label: '社保状态', type: 'picker', placeholder: '请选择社保状态', required: true, options: [
        { label: '正常发放', value: 'normal' },
        { label: '信息变更中', value: 'updating' },
        { label: '待核实', value: 'pending' },
      ] },
      { id: 'contactPhone', label: '联系电话', type: 'phone', placeholder: '请输入联系电话', required: true },
      { id: 'currentAddress', label: '现居住地址', type: 'textarea', placeholder: '请输入现居住地址', required: true },
      { id: 'note', label: '补充说明', type: 'textarea', placeholder: '如有特殊情况请补充说明', required: false },
    ]
  },
  {
    id: 'enterprise-transfer-cadre',
    title: '企业军转干部年审',
    shortTitle: '企业军转年审',
    description: '核验企业军转干部基本信息、现单位状态及联系方式，作为年度资格更新依据。',
    statusText: '待补充资料',
    submitText: '提交企业军转年审',
    tipList: [
      '如已离岗或退休，请在当前单位栏和补充说明中如实填写。',
      '联系电话应保持畅通，便于后续联系核实。',
      '若安置地发生变化，请同步更新现居住地址。'
    ],
    fields: [
      { id: 'name', label: '姓名', type: 'text', placeholder: '请输入姓名', required: true },
      { id: 'idNumber', label: '身份证号', type: 'idcard', placeholder: '请输入身份证号', required: true },
      { id: 'reviewYear', label: '年审年度', type: 'picker', placeholder: '请选择年审年度', required: true, options: yearOptions, initialValue: '2026' },
      { id: 'formerUnit', label: '安置企业', type: 'text', placeholder: '请输入安置企业名称', required: true },
      { id: 'employmentStatus', label: '当前状态', type: 'picker', placeholder: '请选择当前状态', required: true, options: [
        { label: '在岗', value: 'onjob' },
        { label: '离岗待退', value: 'waiting' },
        { label: '已退休', value: 'retired' },
      ] },
      { id: 'contactPhone', label: '联系电话', type: 'phone', placeholder: '请输入联系电话', required: true },
      { id: 'currentAddress', label: '现居住地址', type: 'textarea', placeholder: '请输入现居住地址', required: true },
      { id: 'note', label: '补充说明', type: 'textarea', placeholder: '可填写岗位、退休时间等', required: false },
    ]
  },
]

export const getAnnualReviewConfig = (reviewType?: string) => {
  for (let index = 0; index < annualReviewConfigs.length; index += 1) {
    if (annualReviewConfigs[index].id === reviewType) {
      return annualReviewConfigs[index]
    }
  }

  return annualReviewConfigs[0]
}

export const createInitialFormValues = (reviewConfig: AnnualReviewConfig) => {
  const values = {}

  for (let index = 0; index < reviewConfig.fields.length; index += 1) {
    const field = reviewConfig.fields[index]
    values[field.id] = field.initialValue || ''
  }

  return values as Record<string, string>
}
