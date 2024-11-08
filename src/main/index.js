import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { exec, execFile } from 'child_process'
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import fs from 'fs'
import { join, resolve, basename, extname, dirname } from 'path'
import icon from '../../resources/icon.png?asset'
import { SFOParser } from './sfo.js'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  let mainWindow = createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  let romFolder = '../roms';
  let extractedFilesFolder = '../extracted_files'
  let configFolder = '../config'
  let zipToolFolder = '../7-Zip/7z'
  let defaultPspSimulator = '../ppsspp_win/PPSSPPWindows64.exe'
  let appDir = ''
  if (!is.dev) {
    appDir = process.env.PORTABLE_EXECUTABLE_FILE
  }
  let romPath = join(appDir, romFolder)
  let extractedFilesPath = join(appDir, extractedFilesFolder)
  let configPath = join(appDir, configFolder)
  let zipToolPath = join(appDir, zipToolFolder)
  let defaultPspSimulatorPath = join(appDir, defaultPspSimulator)

  let configFileName = 'pspSimulatorFilePathConfig.txt'

  if (!fs.existsSync(romPath)) {
    fs.mkdirSync(romPath)
  }
  if (!fs.existsSync(extractedFilesPath)) {
    fs.mkdirSync(extractedFilesPath)
  }
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath)
  }

  // 要监听的目录
  // 选项，包括是否递归监听子目录等
  const options = { recursive: true };

  // 回调函数，当文件发生变化时被调用
  const listener = (eventType, filename) => {
    let isoName = filename.substring(0, filename.indexOf("\\"));
    mainWindow.webContents.send("folderUpdate", isoName)
  };

  // 开始监听
  fs.watch(extractedFilesPath, options, listener);

  ipcMain.handle('readDirectory', (event) => {
    let fileList = fs.readdirSync(romPath)
    return fileList.map(file => ({
      fileName: file,
      filePath: resolve(romPath, file)
    }))
  })

  ipcMain.handle("readIsoCover", (event, filePath) => {
    const fileToExtract = 'PSP_GAME/ICON0.PNG'; // ISO文件中要提取的文件路径
    let fileNameWithExtension = basename(filePath);
    let fileExtension = extname(filePath); // 获取文件扩展名
    let folder = fileNameWithExtension.slice(0, -fileExtension.length);
    const outputDir = join(extractedFilesPath, folder); // 提取后的文件保存目录
    let pic = join(outputDir, "ICON0.PNG")
    // 使用7z e命令提取文件
    let exists = fs.existsSync(pic)
    if (exists) {
      return fs.readFileSync(pic)
    }

    exec(`${zipToolPath} e "${filePath}" "${fileToExtract}" -o"${outputDir}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return null;
      }
      return fs.readFileSync(pic)
    });

  })

  ipcMain.handle("readIsoName", (event, filePath) => {
    const fileToExtract = 'PSP_GAME/PARAM.SFO'; // ISO文件中要提取的文件路径
    let fileNameWithExtension = basename(filePath);
    let fileExtension = extname(filePath); // 获取文件扩展名
    let folder = fileNameWithExtension.slice(0, -fileExtension.length);
    const outputDir = join(extractedFilesPath, folder); // 提取后的文件保存目录
    let sfo = join(outputDir, "PARAM.SFO")
    // 使用7z e命令提取文件
    let exists = fs.existsSync(sfo)
    if (exists) {
      let sfoParser = new SFOParser(sfo)
      return sfoParser.getValue("TITLE")
    }
    exec(`${zipToolPath} e "${filePath}" "${fileToExtract}" -o"${outputDir}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
      }
    });
  })

  ipcMain.on("launchGame", (event, simulatorPath, path) => {
    execFile(simulatorPath, [path], (error, stdout, stderr) => {
      console.log(error);
      console.log(stdout);
      console.log(stderr);
    })
  })

  ipcMain.on("openSetupPspSimulatorDialog", (event) => {
    dialog.showOpenDialog({
      "title": "请选择PSP模拟器的exe文件",
      "filters": [
        { name: 'exe File', extensions: ['exe'] }
      ]
    }).then(result => {
      console.log("result=", result)
      if (result.canceled) {
        return
      }
      let filePath = result.filePaths[0];
      fs.writeFileSync(join(configPath, configFileName), filePath)
      mainWindow.webContents.send('pspSimulatorPathUpdate')
    }).catch(error => {
      console.log(error)
    })
  })

  ipcMain.handle("readPspSimulatorPath", (event) => {
    let configFilePath = join(configPath, configFileName)
    let exists = fs.existsSync(configFilePath)
    if (!exists) {
      if (fs.existsSync(defaultPspSimulatorPath)) {
        return resolve(defaultPspSimulatorPath);
      }
      return null
    }
    return fs.readFileSync(configFilePath).toString('utf-8')
  })

  ipcMain.handle("readPspRomPath", (event) => {
    return resolve(romPath)
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
