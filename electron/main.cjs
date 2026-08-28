const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')
const http = require('node:http')
const fs = require('node:fs')

const DIST_DIR = path.join(__dirname, '..', 'dist')

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

/**
 * The app's router uses HTML5 history mode, which needs a real server (not a
 * file:// load) so deep routes and asset paths resolve correctly. This is a
 * minimal static server with SPA fallback — no framework needed for a
 * handful of file types.
 */
function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent((req.url || '/').split('?')[0])
    let filePath = path.join(DIST_DIR, reqPath)

    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html')
    }

    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
    fs.createReadStream(filePath).pipe(res)
  })
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: 420,
    height: 860,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: '#121413',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.loadURL(`http://localhost:${port}/`)

  // Open any external link (e.g. GitHub, docs) in the OS browser instead of
  // inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  const server = createStaticServer()
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    createWindow(port)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const { port } = server.address()
      createWindow(port)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
