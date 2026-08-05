import Mock from 'mockjs'

const responseTemplate = {
  code: 200,
  message: 'success',
  data: null,
}

const nowStr = () => Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')

const makeComment = (overrides = {}) => ({
  id: Mock.Random.guid(),
  user: Mock.Random.cname(),
  avatar: Mock.Random.image('100x100', Mock.Random.color(), '#fff', 'png', 'U'),
  content: Mock.Random.cparagraph(1, 2),
  time: nowStr(),
  likes: Mock.Random.integer(0, 40),
  children: [],
  ...overrides,
})

// 按作品缓存评论与点赞状态
const commentsMap = {}
const likesMap = {}

const ensureComments = (workId) => {
  const key = String(workId)
  if (commentsMap[key]) return commentsMap[key]

  const count = Mock.Random.integer(5, 8)
  const list = []

  for (let i = 0; i < count; i++) {
    const root = makeComment({
      content: [
        '这个作品太赞了！学习了',
        '设计思路清晰，技术实现出色',
        '封面和交互都做得很好，期待开源',
        '请问用的是什么技术栈？',
        '创意很棒，组队时可以交流一下',
        '细节打磨很到位，收藏了',
      ][i % 6],
    })

    // 部分评论带回复
    if (i % 2 === 0) {
      root.children = [
        makeComment({
          user: '李同学',
          content: `@${root.user} 同感，尤其是动效部分`,
          likes: Mock.Random.integer(0, 12),
        }),
      ]
      if (i % 4 === 0) {
        root.children.push(
          makeComment({
            user: '王老师',
            content: `@${root.user} 建议补充一下部署说明`,
            likes: Mock.Random.integer(0, 8),
          })
        )
      }
    }

    list.push(root)
  }

  commentsMap[key] = list
  return list
}

const findComment = (list, id) => {
  for (const item of list) {
    if (item.id === id) return item
    if (item.children?.length) {
      const found = findComment(item.children, id)
      if (found) return found
    }
  }
  return null
}

const countComments = (list) =>
  list.reduce((sum, item) => sum + 1 + countComments(item.children || []), 0)

// GET /api/works/:id/comments
Mock.mock(/\/api\/works\/\d+\/comments$/, 'get', (options) => {
  const id = String(options.url).match(/\/api\/works\/(\d+)\/comments/)?.[1]
  const list = ensureComments(id)
  return {
    ...responseTemplate,
    data: {
      list,
      total: countComments(list),
    },
  }
})

// POST /api/works/:id/comments
Mock.mock(/\/api\/works\/\d+\/comments$/, 'post', (options) => {
  const id = String(options.url).match(/\/api\/works\/(\d+)\/comments/)?.[1]
  const body = JSON.parse(options.body || '{}')
  const list = ensureComments(id)

  const newComment = makeComment({
    user: '张同学',
    avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
    content: body.content || '',
    likes: 0,
    children: [],
  })

  if (body.parentId) {
    const parent = findComment(list, body.parentId)
    if (parent) {
      parent.children = parent.children || []
      // 回复时保证带 @用户名
      if (!String(newComment.content).includes(`@${parent.user}`)) {
        newComment.content = `@${parent.user} ${newComment.content}`.trim()
      }
      parent.children.push(newComment)
    } else {
      list.unshift(newComment)
    }
  } else {
    list.unshift(newComment)
  }

  return {
    ...responseTemplate,
    message: '评论成功',
    data: {
      comment: newComment,
      list,
      total: countComments(list),
    },
  }
})

// POST /api/works/:id/like
Mock.mock(/\/api\/works\/\d+\/like$/, 'post', (options) => {
  const id = String(options.url).match(/\/api\/works\/(\d+)\/like/)?.[1]
  const key = String(id)
  const body = JSON.parse(options.body || '{}')
  if (!likesMap[key]) {
    likesMap[key] = {
      liked: false,
      likes: typeof body.likes === 'number' ? body.likes : Mock.Random.integer(20, 180),
    }
  }
  likesMap[key].liked = !likesMap[key].liked
  likesMap[key].likes += likesMap[key].liked ? 1 : -1
  if (likesMap[key].likes < 0) likesMap[key].likes = 0

  return {
    ...responseTemplate,
    data: {
      workId: Number(id),
      liked: likesMap[key].liked,
      likes: likesMap[key].likes,
    },
  }
})

// POST /api/comments/:id/like
Mock.mock(/\/api\/comments\/.+\/like$/, 'post', () => ({
  ...responseTemplate,
  data: { success: true },
}))

export default {
  commentsMap,
  likesMap,
}
