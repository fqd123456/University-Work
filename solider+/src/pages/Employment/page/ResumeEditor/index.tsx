import { View, Text, Input, Textarea, Image } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { ResumeProfile } from '../../types'
import './index.scss'

type ResumeForm = {
  fullName: string
  birthDate: string
  targetPosition: string
  expectedSalary: string
  targetCity: string
  phone: string
  idPhoto: string
  certificateNamesText: string
  certificateFiles: string[]
  bio: string
}

const emptyForm: ResumeForm = {
  fullName: '',
  birthDate: '',
  targetPosition: '',
  expectedSalary: '',
  targetCity: '',
  phone: '',
  idPhoto: '',
  certificateNamesText: '',
  certificateFiles: [],
  bio: '',
}

const normalizeUserInfo = (rawUser: any) => {
  if (!rawUser) return null
  const source = rawUser.data ? rawUser.data : rawUser
  return {
    realName: source.real_name || source.realName || '',
    placementRegion: source.veteran_placement_region || source.placement_region || source.service_region || source.serviceRegion || '',
    birthDate: source.birth_date || source.birthDate || '',
    phone: source.phone || '',
  }
}

const toForm = (profile: ResumeProfile | null, userInfo: ReturnType<typeof normalizeUserInfo>): ResumeForm => {
  if (!profile) {
    return {
      ...emptyForm,
      fullName: userInfo && userInfo.realName ? userInfo.realName : '',
      birthDate: userInfo && userInfo.birthDate ? userInfo.birthDate : '',
      targetCity: userInfo && userInfo.placementRegion ? userInfo.placementRegion : '',
      phone: userInfo && userInfo.phone ? userInfo.phone : '',
    }
  }

  return {
    fullName: profile.fullName || (userInfo && userInfo.realName) || '',
    birthDate: profile.birthDate || (userInfo && userInfo.birthDate) || '',
    targetPosition: profile.targetPosition || '',
    expectedSalary: profile.expectedSalary || '',
    targetCity: profile.targetCity || (userInfo && userInfo.placementRegion) || '',
    phone: (userInfo && userInfo.phone) || profile.phone || '',
    idPhoto: profile.idPhoto || '',
    certificateNamesText: Array.isArray(profile.certificateNames) ? profile.certificateNames.join('，') : '',
    certificateFiles: Array.isArray(profile.certificates) ? profile.certificates : [],
    bio: profile.bio || '',
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '处理失败，请稍后重试'
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

const EmploymentResumeEditor = () => {
  const [form, setForm] = useState<ResumeForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [userRes, dashboardRes] = await Promise.all([
        Taro.cloud.callFunction({ name: 'getUserProfile' }),
        Taro.cloud.callFunction({ name: 'getEmploymentData' }),
      ])

      const userResult = userRes.result as any
      const dashboardResult = dashboardRes.result as any
      const userInfo = normalizeUserInfo(userResult && userResult.data)
      const profile = dashboardResult && dashboardResult.success ? (dashboardResult.data.resumeProfile as ResumeProfile | null) : null

      if (!userInfo || !userInfo.realName) {
        Taro.showModal({
          title: '请先完成身份认证',
          content: '真实姓名、安置地和手机号需先在身份认证页完善。',
          confirmText: '去认证',
          cancelText: '返回',
        }).then((res) => {
          if (res.confirm) {
            Taro.redirectTo({ url: '/pages/VeteranAuth/index' })
          } else {
            Taro.navigateBack()
          }
        })
        return
      }

      setForm(toForm(profile, userInfo))
    } catch (error) {
      console.error('加载简历信息失败', error)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const updateField = (field: keyof ResumeForm, value: string | string[]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const uploadFiles = async (tempPaths: string[], prefix: string) => {
    const uploaded = await Promise.all(tempPaths.map(async (filePath, index) => {
      if (filePath.indexOf('cloud://') === 0) {
        return filePath
      }

      const ext = filePath.split('.').pop() || 'jpg'
      const cloudPath = `employment-resume/${prefix}_${Date.now()}_${index}.${ext}`
      const res = await Taro.cloud.uploadFile({ cloudPath, filePath })
      return res.fileID
    }))

    return uploaded
  }

  const chooseIdPhoto = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      const path = res.tempFilePaths && res.tempFilePaths[0]
      if (path) {
        updateField('idPhoto', path)
      }
    } catch (error) {
      console.error('选择证件照失败', error)
    }
  }

  const chooseCertificates = async () => {
    try {
      const res = await Taro.chooseImage({ count: 6, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      const files = res.tempFilePaths || []
      if (files.length) {
        updateField('certificateFiles', [...form.certificateFiles, ...files].slice(0, 6))
      }
    } catch (error) {
      console.error('选择证书失败', error)
    }
  }

  const handleSave = async () => {
    if (saving) return
    if (!form.targetPosition.trim()) {
      Taro.showToast({ title: '请填写意向岗位', icon: 'none' })
      return
    }

    try {
      setSaving(true)
      const idPhotoList = form.idPhoto ? await uploadFiles([form.idPhoto], 'id_photo') : []
      const certificateFiles = form.certificateFiles.length ? await uploadFiles(form.certificateFiles, 'certificate') : []
      const certificateNames = form.certificateNamesText
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean)

      const res = await Taro.cloud.callFunction({
        name: 'saveEmploymentProfile',
        data: {
          targetPosition: form.targetPosition,
          expectedSalary: form.expectedSalary,
          targetCity: form.targetCity,
          phone: form.phone,
          idPhoto: idPhotoList[0] || form.idPhoto,
          certificates: certificateFiles.length ? certificateFiles : form.certificateFiles,
          certificateNames,
          highlights: certificateNames,
          bio: form.bio,
        }
      })
      const result = res.result as any

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '保存失败')
      }

      Taro.showToast({ title: '简历已保存', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 600)
    } catch (error) {
      console.error('保存简历失败', error)
      Taro.showToast({ title: getErrorMessage(error), icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
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

  return (
    <View className='resume-editor-page'>
      {loading && <LightLoading text='正在加载简历信息...' />}

      {!loading && (
        <>
          <View className='resume-editor-card'>
            <View className='resume-editor-row'>
              <Text className='resume-editor-label'>真实姓名</Text>
              <Text className='resume-editor-static'>{form.fullName || '未同步'}</Text>
            </View>
            <View className='resume-editor-row'>
              <Text className='resume-editor-label'>出生年月</Text>
              <Text className='resume-editor-static'>{form.birthDate || '未填写'}</Text>
            </View>
            <View className='resume-editor-row'>
              <Text className='resume-editor-label'>意向岗位</Text>
              <Input className='resume-editor-input' value={form.targetPosition} placeholder='如安防主管 / 行政运营' onInput={(e) => updateField('targetPosition', e.detail.value)} />
            </View>
            <View className='resume-editor-row'>
              <Text className='resume-editor-label'>期望薪资</Text>
              <Input className='resume-editor-input' value={form.expectedSalary} placeholder='如 7000-9000 元/月' onInput={(e) => updateField('expectedSalary', e.detail.value)} />
            </View>
            <View className='resume-editor-row'>
              <Text className='resume-editor-label'>意向工作地</Text>
              <Input className='resume-editor-input' value={form.targetCity} placeholder='请输入意向工作地' onInput={(e) => updateField('targetCity', e.detail.value)} />
            </View>
            <View className='resume-editor-row'>
              <Text className='resume-editor-label'>联系电话</Text>
              <Input className='resume-editor-input' value={form.phone} placeholder='请输入联系电话' onInput={(e) => updateField('phone', e.detail.value)} />
            </View>
          </View>

          <View className='resume-editor-card'>
            <View className='resume-editor-upload-head'>
              <Text className='resume-editor-section-title'>个人证件照</Text>
              <Text className='resume-editor-link' onClick={chooseIdPhoto}>上传</Text>
            </View>
            {form.idPhoto ? <Image className='resume-editor-id-photo' src={form.idPhoto} mode='aspectFill' /> : <Text className='resume-editor-empty'>请上传个人证件照</Text>}
          </View>

          <View className='resume-editor-card'>
            <View className='resume-editor-upload-head'>
              <Text className='resume-editor-section-title'>证书与证明</Text>
              <Text className='resume-editor-link' onClick={chooseCertificates}>上传证书</Text>
            </View>
            <Input className='resume-editor-input resume-editor-input-block' value={form.certificateNamesText} placeholder='请输入证书名称，多个用逗号分隔' onInput={(e) => updateField('certificateNamesText', e.detail.value)} />
            {form.certificateFiles.length > 0 ? (
              <View className='resume-editor-cert-list'>
                {form.certificateFiles.map((item, index) => (
                  <Image key={`${item}-${index}`} className='resume-editor-cert-img' src={item} mode='aspectFill' />
                ))}
              </View>
            ) : (
              <Text className='resume-editor-empty'>可上传证书照片、培训证明等资料</Text>
            )}
          </View>

          <View className='resume-editor-card'>
            <Text className='resume-editor-section-title'>个人简介</Text>
            <Textarea className='resume-editor-textarea' value={form.bio} maxlength={300} placeholder='介绍服役经历、技能特长、求职方向等' onInput={(e) => updateField('bio', e.detail.value)} />
            <Text className='resume-editor-count'>{form.bio.length}/300</Text>
          </View>

          <View className='resume-editor-action-row'>
            <View className='resume-editor-primary-btn' onClick={handleSave}>
              <Text className='resume-editor-primary-text'>{saving ? '保存中...' : '完善简历'}</Text>
            </View>
            <View className='resume-editor-secondary-btn' onClick={handleDownload}>
              <Text className='resume-editor-secondary-text'>下载简历</Text>
            </View>
          </View>
        </>
      )}
    </View>
  )
}

export default EmploymentResumeEditor
