# 师生交互平台 · 部署到公网（人人可访问、数据共享）

本项目现在包含**真实后端**（`server/`），数据统一存放在服务器的
`server/data/data.json`，所有访问者共享同一份数据，无需各自浏览器缓存。

---

## 一、本地运行（先验证）

```bash
# 1) 装后端依赖（只需一次）
cd server
npm install

# 2) 启动后端（默认端口 3001）
npm start
# 终端应显示：✅ 师生交互平台后端已启动: http://localhost:3001

# 3) 另开一个终端，构建并启动前端（开发模式会自动把 /api 代理到 3001）
cd ..            # 回到项目根
npm install      # 若前端依赖未装
npm run dev      # 打开 http://localhost:3000
```

> 也可以**只跑后端 + 生产前端**：
> `npm run build` 生成 `dist/`，后端会自动托管 `dist/` 并做 SPA 回退，
> 直接访问 `http://localhost:3001` 即可（前后端同源，无需代理）。

### 测试账号（内置，密码均为 `123456`）
| 角色 | 用户名 | 密码 | 说明 |
|---|---|---|---|
| 学生 | `student` | `123456` | 张同学（演示） |
| 教师-管理员 | `admin` | `123456` | 全部管理菜单 |
| 教师-管理员 | `teacher` | `123456` | 李老师 |
| 教师-带队 | `leader` | `123456` | 王老师（可审核队伍） |

注册的新学生/教师默认进入对应角色；学生可在"账号管理"里被管理员重置密码/删除。

---

## 二、部署到公网（拿一个对外网址）

### 方案 A：GitHub + Render（免费，最简单，不用自己买服务器）

1. **把代码推到 GitHub**
   - 在项目根新建 `.gitignore`，加入：
     ```
     node_modules/
     server/node_modules/
     server/data/data.json
     dist/
     ```
   - 创建 GitHub 仓库，把 `server/`、`src/`、`index.html`、`package.json`、
     `vite.config.js`、`.env.production` 等提交上去（**不要提交 `server/data/data.json`**，让它首次启动自动生成种子）。

2. **在 Render 创建 Web Service**
   - 登录 https://render.com （可用 GitHub 登录）
   - New → Web Service → 关联你的 GitHub 仓库
   - 配置：
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `node server/index.js`
     - **Environment**: 加一个变量 `PORT=3001`（Render 会自动注入，但写死更稳）
   - 创建后会分配一个 `xxx.onrender.com` 的公网网址。
   - **注意**：Render 免费版休眠后 `data.json` 仍在（持久磁盘），但**免费实例重启会重置非持久目录**——
     本项目数据写在 `server/data/data.json`，Render 的磁盘默认持久，**数据不会丢**；
     若日后迁移，记得把该文件一并带走。

3. 打开分配的网址即可，所有人都能访问、且共享同一份数据。

### 方案 B：自己的云服务器（阿里云/腾讯云 ECS，国内访问快、可绑域名）

```bash
# 服务器：装 Node 18+（用 nvm 或官方二进制）
# 把整个项目传上去（git clone 或 scp）
npm install && npm run build
cd server && npm install

# 用 pm2 守护后端（推荐）
npm i -g pm2
pm2 start server/index.js --name shisheng
pm2 save && pm2 startup
```

Nginx 反代（可选，若要绑域名 `https://yourdomain.com`）：
```nginx
server {
    listen 80; server_name yourdomain.com;
    location /api/ { proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host; }
    location /uploads/ { proxy_pass http://127.0.0.1:3001; }
    location / {
        root /path/to/项目/dist;
        try_files $uri $uri/ /index.html;   # SPA 回退，刷新深链不 404
    }
}
```
（也可以不用 Nginx，直接用后端 3001 端口对外，因为后端已托管 `dist/` 和 `/api`。）

> 国内绑定中文域名需 **ICP 备案**；仅用 IP 或 Render 的 `.onrender.com` 子域可跳过。

---

## 三、接口契约（前端已实现，后端已对齐）

- 统一响应：`{ code:200, message, data }`，`code≠200` 前端弹错，`code=401` 前端跳登录。
- 鉴权：请求头 `Authorization: Bearer <token>`，token 由后端签发（含用户 id，重启不失效）。
- 完整接口清单见 `src/api/index.js`，后端实现见 `server/index.js`。

### 队伍聊天（共享）
- `GET /api/teams/:id/messages` —— 拉取该队伍聊天（仅成员/带队老师可见）
- `POST /api/teams/:id/messages` —— 发送 `{ type:'text'|'image'|'file', content, fileName, fileSize }`
- 图片/文件先 `POST /api/upload`（multipart，字段名 `file`），拿到 URL 再随消息发出。

---

## 四、常见问题

- **刷新 `/student/...` 报 404**：必须是后端托管 `dist/`（已内置 `try_files` 回退）或 Nginx 加 `try_files`，纯静态 `python -m http.server` 不行。
- **改了代码要重新 build**：`npm run build` 后后端会自动 serve 新 `dist/`；开发期用 `npm run dev` 即可。
- **数据存哪**：`server/data/data.json`，要清空演示数据直接删该文件重启即可。
- **聊天记录跨设备同步**：已通过后端接口实现，不再依赖浏览器 localStorage。
