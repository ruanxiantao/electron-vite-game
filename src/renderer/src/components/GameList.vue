<template>
    <div>
        <div class="common-layout">
            <div
                style="display: flex; justify-content: center; align-items: center; margin-top: 20px; margin-bottom: 10px;">
                <!-- 将 el-input 和 el-button 放在同一个 flex 容器中 -->
                <div style="display: flex; flex-grow: 1; justify-content: center;">
                    <el-input v-model="searchword" style="width: 240px;" placeholder="请输入游戏名称" />
                </div>
                <el-button type="danger" round style="margin-left: auto;" @click="setupPspSimulator">设置PSP模拟器路径</el-button>
            </div>
            <div style="display: flex; flex-grow: 1; justify-content: right; margin-top: 10px; margin-bottom: 10px;">
                <span>{{ pspSimulatorPath }}</span>
            </div>

            <el-scrollbar height="500px">
                <el-space direction="vertical">
                    <div v-for="game in gameList" :key="game.id">
                        <el-card v-if="isShow(game.info.name)" style="width: 1000px;" class="box-card">
                            <div style="display: flex; align-items: center;">
                                <el-image :src="game.info.cover" fit="contain"
                                    style="margin-right: 10px; height: 100px;" />
                                <span style="font-weight: bold;">{{ game.info.name }}</span>
                                <el-button type="success" style="margin-left: auto;" @click="launchGame(game.id)"
                                    round>开始游戏</el-button>
                            </div>
                        </el-card>
                    </div>
                </el-space>
            </el-scrollbar>

            <div style="display: flex; justify-content: right; align-items: center; margin-top: 10px;">
                <span>共{{ gamecount }}个游戏</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="GameList">
import { onMounted, reactive, ref, computed } from 'vue';
import { type Game } from '../types/index';
import psp from '@/resources/psp.png';

let gameList = reactive<Game[]>([])
let searchword = ref('')
let gamecount = computed(() => {
    return gameList.filter(game => isShow(game.info.name)).length;
})
let pspSimulatorPath = ref('');

onMounted(() => {
    listenerFolder()
    init();
})

function setupPspSimulator() {
    const ipcRenderer = window.electron.ipcRenderer;
    ipcRenderer.send("openSetupPspSimulatorDialog")
}

function isShow(gameName: string) {
    let name: string = gameName.toLowerCase();
    let word: string = searchword.value.toLowerCase();
    return name.includes(word);
}

function launchGame(id) {
    const ipcRenderer = window.electron.ipcRenderer;
    ipcRenderer.send("launchGame", id)
}

function listenerFolder() {
    const ipcRenderer = window.electron.ipcRenderer;
    ipcRenderer.on('folderUpdate', (event, message) => {
        gameList.forEach(item => {
            if (item.id.startsWith(message)) {
                readIsoCover(item.id).then((data) => updateGameCover(item.id, data))
                readIsoName(item.id).then((data) => updateGameName(item.id, data))
            }
        })
    });
    ipcRenderer.on('pspSimulatorPathUpdate', (event) => {
        readPspSimulatorPath()
    });
}

async function init() {
    let list = await readDirectory()
    list.forEach((fileName: string) => {
        let game = {
            id: fileName,
            info: {
                cover: psp,
                name: ""
            }
        }
        gameList.push(game)
        readIsoCover(fileName).then((data) => updateGameCover(fileName, data))
        readIsoName(fileName).then((data) => updateGameName(fileName, data))
    })
    readPspSimulatorPath();
}

async function readPspSimulatorPath() {
    const ipcRenderer = window.electron.ipcRenderer;
    let path = await ipcRenderer.invoke("readPspSimulatorPath")
    if (!path) {
        pspSimulatorPath.value = '未设置PSP模拟器路径' 
        return
    }
    pspSimulatorPath.value = path;
    
}

function updateGameCover(fileName: string, gameCoverData: BlobPart) {
    let gameItem = gameList.find(item => item.id === fileName)
    if (!gameCoverData) {
        return
    } else {
        const blob = new Blob([gameCoverData], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        console.log("cover=", url)
        let gameItem = gameList.find(item => item.id === fileName)
        gameItem!.info.cover = url
    }
}

function updateGameName(fileName: string, gameName: string) {
    let gameItem = gameList.find(item => item.id === fileName)
    if (!gameName) {
        gameItem!.info.name = fileName
    } else {
        gameItem!.info.name = gameName
    }
}

async function readDirectory() {
    const ipcRenderer = window.electron.ipcRenderer;
    let gameList = await ipcRenderer.invoke("readDirectory")
    return gameList;
}

async function readIsoCover(fileName) {
    const ipcRenderer = window.electron.ipcRenderer;
    let conver = await ipcRenderer.invoke("readIsoCover", fileName)
    return conver;
}

async function readIsoName(fileName) {
    const ipcRenderer = window.electron.ipcRenderer;
    let name = await ipcRenderer.invoke("readIsoName", fileName)
    return name;
}
</script>