import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import {
  AnnualReviewField,
  createInitialFormValues,
  getAnnualReviewConfig,
} from './config'
import './index.scss'

const getPickerLabel = (field: AnnualReviewField, value: string) => {
  if (!field.options || !field.options.length || !value) {
    return ''
  }

  for (let index = 0; index < field.options.length; index += 1) {
    if (field.options[index].value === value) {
      return field.options[index].label
    }
  }

  return ''
}

const AnnualReview = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const reviewType = router && router.params ? router.params.type : undefined
  const reviewConfig = getAnnualReviewConfig(reviewType)
  const [formValues, setFormValues] = useState<Record<string, string>>(() => createInitialFormValues(reviewConfig))

  useEffect(() => {
    setFormValues(createInitialFormValues(reviewConfig))
    Taro.setNavigationBarTitle({
      title: reviewConfig.shortTitle,
    })
  }, [reviewConfig])

  const setFieldValue = (fieldId: string, value: string) => {
    setFormValues((current) => ({
      ...current,
      [fieldId]: value,
    }))
  }

  const validateForm = () => {
    for (let index = 0; index < reviewConfig.fields.length; index += 1) {
      const field = reviewConfig.fields[index]
      const value = formValues[field.id] ? `${formValues[field.id]}`.trim() : ''

      if (field.required && !value) {
        Taro.showToast({
          title: `请填写${field.label}`,
          icon: 'none',
        })
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    Taro.showLoading({ title: '提交中...' })

    setTimeout(async () => {
      Taro.hideLoading()

      const modalRes = await Taro.showModal({
        title: '提交成功',
        content: `${reviewConfig.shortTitle}已提交，等待审核。`,
        confirmText: '知道了',
        showCancel: false,
      })

      if (modalRes.confirm) {
        Taro.navigateBack()
      }
    }, 800)
  }

  const renderField = (field: AnnualReviewField) => {
    const value = formValues[field.id] || ''

    if (field.type === 'picker' && field.options) {
      const currentIndex = field.options.findIndex(option => option.value === value)

      return (
        <Picker
          mode='selector'
          range={field.options.map(option => option.label)}
          value={currentIndex > -1 ? currentIndex : 0}
          onChange={(event) => {
            const nextIndex = Number(event.detail.value)
            const nextOption = field.options && field.options[nextIndex] ? field.options[nextIndex] : null
            setFieldValue(field.id, nextOption ? nextOption.value : '')
          }}
        >
          <View className={`annual-review-picker ${value ? 'annual-review-picker-value' : ''}`}>
            <Text>{value ? getPickerLabel(field, value) : field.placeholder}</Text>
          </View>
        </Picker>
      )
    }

    if (field.type === 'date') {
      return (
        <Picker
          mode='date'
          value={value}
          onChange={(event) => setFieldValue(field.id, event.detail.value)}
        >
          <View className={`annual-review-picker ${value ? 'annual-review-picker-value' : ''}`}>
            <Text>{value || field.placeholder}</Text>
          </View>
        </Picker>
      )
    }

    if (field.type === 'textarea') {
      return (
        <Textarea
          className='annual-review-textarea'
          placeholder={field.placeholder}
          value={value}
          maxlength={300}
          onInput={(event) => setFieldValue(field.id, event.detail.value)}
        />
      )
    }

    const inputType = field.type === 'phone' ? 'number' : field.type === 'number' ? 'digit' : 'text'

    return (
      <Input
        className='annual-review-input'
        type={inputType}
        maxlength={field.type === 'idcard' ? 18 : 50}
        placeholder={field.placeholder}
        value={value}
        onInput={(event) => setFieldValue(field.id, event.detail.value)}
      />
    )
  }

  return (
    <View className='annual-review-page'>
      <View className='annual-review-hero'>
        <Text className='annual-review-status'>{reviewConfig.statusText}</Text>
        <Text className='annual-review-title'>{reviewConfig.title}</Text>
        <Text className='annual-review-desc'>{reviewConfig.description}</Text>
      </View>

      <View className='annual-review-card'>
        <View className='annual-review-section-head'>
          <Text className='annual-review-section-title'>基础信息</Text>
          <Text className='annual-review-section-subtitle'>请按要求完成填报</Text>
        </View>

        {reviewConfig.fields.map((field) => (
          <View
            key={field.id}
            className={`annual-review-field ${field.type === 'textarea' ? 'annual-review-field-column' : ''}`}
          >
            <View className='annual-review-label-wrap'>
              <Text className='annual-review-label'>{field.label}</Text>
              {field.required && <Text className='annual-review-required'>*</Text>}
            </View>
            <View className='annual-review-control'>
              {renderField(field)}
            </View>
          </View>
        ))}
      </View>

      <View className='annual-review-card annual-review-tips'>
        <View className='annual-review-section-head'>
          <Text className='annual-review-section-title'>提交说明</Text>
          <Text className='annual-review-section-subtitle'>审核前请再次核对</Text>
        </View>
        {reviewConfig.tipList.map((tip) => (
          <Text key={tip} className='annual-review-tip-item'>{tip}</Text>
        ))}
      </View>

      <View className='annual-review-submit' onClick={handleSubmit}>
        <Text className='annual-review-submit-text'>{reviewConfig.submitText}</Text>
      </View>
    </View>
  )
}

export default AnnualReview
