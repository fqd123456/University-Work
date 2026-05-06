const cloud = require('wx-server-sdk')
const PDFDocument = require('pdfkit')
const path = require('path')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const FONT_PATH = path.join(__dirname, 'assets', 'NotoSansSC-Regular.otf')
const PAGE_MARGIN = 48
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2

const createDocBuffer = (doc) => new Promise((resolve, reject) => {
  const buffers = []
  doc.on('data', (chunk) => buffers.push(chunk))
  doc.on('end', () => resolve(Buffer.concat(buffers)))
  doc.on('error', reject)
})

const normalizeArray = (value) => Array.isArray(value) ? value.filter(Boolean) : []

const buildSection = (doc, title, lines) => {
  const cleanLines = normalizeArray(lines)
  if (!cleanLines.length) {
    return
  }

  doc.moveDown(0.8)
  doc.fontSize(15).fillColor('#8b3636').text(title, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.35)
  doc.fontSize(11).fillColor('#2d2d2d')

  cleanLines.forEach((item) => {
    doc.text(`• ${item}`, PAGE_MARGIN + 4, doc.y, {
      width: CONTENT_WIDTH - 4,
      lineGap: 4,
    })
    doc.moveDown(0.15)
  })
}

const buildLabelLine = (doc, label, value) => {
  if (!value) {
    return
  }

  doc.fontSize(11).fillColor('#2d2d2d').text(`${label}：${value}`, PAGE_MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 4,
  })
  doc.moveDown(0.2)
}

const fetchFileBuffer = async (fileId) => {
  if (!fileId || `${fileId}`.indexOf('cloud://') !== 0) {
    return null
  }

  try {
    const res = await cloud.downloadFile({ fileID: fileId })
    return res.fileContent || null
  } catch (error) {
    console.error('下载云文件失败', error)
    return null
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const [profileRes, userRes] = await Promise.all([
      db.collection('employment_profiles').where({ userId: OPENID }).limit(1).get(),
      db.collection('users').doc(OPENID).get().catch(() => ({ data: null })),
    ])

    const profile = profileRes.data && profileRes.data.length ? profileRes.data[0] : null
    const userDoc = userRes.data || {}

    if (!profile) {
      return {
        success: false,
        message: '请先完善个人简历'
      }
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      info: {
        Title: '个人简历',
        Author: '兵+ 小程序',
      }
    })

    doc.registerFont('CN', FONT_PATH)
    doc.font('CN')
    const bufferPromise = createDocBuffer(doc)

    doc.rect(0, 0, 595.28, 118).fill('#8b3636')
    doc.fillColor('#ffffff')
    doc.fontSize(24).text(profile.fullName || '个人简历', PAGE_MARGIN, 38)
    doc.fontSize(12).text('退役军人就业服务简历', PAGE_MARGIN, 72)

    doc.fillColor('#2d2d2d')
    doc.moveDown(2)
    buildLabelLine(doc, '真实姓名', profile.fullName)
    buildLabelLine(doc, '出生年月', profile.birthDate || userDoc.birth_date || '')
    buildLabelLine(doc, '意向岗位', profile.targetPosition)
    buildLabelLine(doc, '期望薪资', profile.expectedSalary)
    buildLabelLine(doc, '意向工作地', profile.targetCity)
    buildLabelLine(doc, '联系电话', profile.phone)
    buildLabelLine(doc, '更新时间', profile.lastUpdatedAt)

    const idPhotoBuffer = await fetchFileBuffer(profile.idPhoto)
    if (idPhotoBuffer) {
      const imageY = 132
      doc.image(idPhotoBuffer, 430, imageY, {
        fit: [110, 140],
        align: 'center',
        valign: 'center',
      })
      if (doc.y < 286) {
        doc.y = 286
      }
    }

    buildSection(doc, '证书与技能', normalizeArray(profile.certificateNames && profile.certificateNames.length ? profile.certificateNames : profile.highlights))

    if (profile.bio) {
      buildSection(doc, '个人简介', [profile.bio])
    }

    doc.end()
    const pdfBuffer = await bufferPromise
    const fileName = `${profile.fullName || 'resume'}_${Date.now()}.pdf`
    const cloudPath = `employment-resume/pdf/${OPENID}/${fileName}`

    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: pdfBuffer,
    })

    const tempUrlRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID],
    })

    return {
      success: true,
      data: {
        fileID: uploadRes.fileID,
        fileName,
        tempFileURL: tempUrlRes.fileList && tempUrlRes.fileList[0] ? tempUrlRes.fileList[0].tempFileURL : '',
      }
    }
  } catch (error) {
    console.error('生成简历 PDF 失败', error)
    return {
      success: false,
      message: '生成简历 PDF 失败',
      error,
    }
  }
}
