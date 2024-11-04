import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { exec, execFile } from 'child_process'
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import fs from 'fs'
import { join, resolve } from 'path'
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

  // 要监听的目录
  const dir = '../extracted_files/';

  // 选项，包括是否递归监听子目录等
  const options = { recursive: true };

  // 回调函数，当文件发生变化时被调用
  const listener = (eventType, filename) => {
    let isoName = filename.substring(0, filename.indexOf("\\"));
    mainWindow.webContents.send("folderUpdate", isoName)
  };

  // 开始监听
  fs.watch(dir, options, listener);

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

  ipcMain.handle('readDirectory', (event) => {
    return fs.readdirSync("../roms")
  })

  ipcMain.handle("readIsoCover", (event, fileName) => {
    const isoFilePath = join("../roms", fileName); // 执行 7z 命令获取封面 
    const fileToExtract = 'PSP_GAME/ICON0.PNG'; // ISO文件中要提取的文件路径
    let folder = fileName.substring(0, fileName.indexOf('.'))
    const outputDir = join('../extracted_files', folder); // 提取后的文件保存目录
    let pic = resolve(join(outputDir, "ICON0.PNG"))
    // 使用7z e命令提取文件
    let exists = fs.existsSync(pic)
    if (exists) {
      return fs.readFileSync(pic)
    }

    exec(`"../7-Zip/7z" e "${isoFilePath}" "${fileToExtract}" -o"${outputDir}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return null;
      }
      return fs.readFileSync(pic)
    });

  })

  ipcMain.handle("readIsoName", (event, fileName) => {
    const isoFilePath = join("../roms", fileName) // 执行 7z 命令获取名称 
    const fileToExtract = 'PSP_GAME/PARAM.SFO'; // ISO文件中要提取的文件路径
    let folder = fileName.substring(0, fileName.indexOf('.'))
    const outputDir = join('../extracted_files', folder); // 提取后的文件保存目录
    let sfo = resolve(join(outputDir, "PARAM.SFO"))
    // 使用7z e命令提取文件
    let exists = fs.existsSync(sfo)
    if (exists) {
      let sfoParser = new SFOParser(sfo)
      return sfoParser.getValue("TITLE")
    }
    exec(`"../7-Zip/7z" e "${isoFilePath}" "${fileToExtract}" -o"${outputDir}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
      }
    });
  })

  ipcMain.on("launchGame", (event, id) => {
    console.log("aaa" + id)
    let pspPath = "E:/software/ppsspp_win/PPSSPPWindows64.exe"
    let file = join("../roms", id)
    console.log("aaa" + file)
    execFile(pspPath, [file], (error, stdout, stderr) => {
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
      fs.writeFileSync('../config/pspSimulatorFilePathConfig.txt', filePath)
      mainWindow.webContents.send('pspSimulatorPathUpdate')
    }).catch(error => {
      console.log(error)
    })
  })

  ipcMain.handle("readPspSimulatorPath", (event) => {
    let configPath = '../config/pspSimulatorFilePathConfig.txt';
    let exists = fs.existsSync(configPath)
    if (!exists) {
      return null
    }
    return fs.readFileSync(configPath).toString('utf-8')
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
