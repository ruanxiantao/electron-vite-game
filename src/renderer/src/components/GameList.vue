<template>
    <div>
        <div class="common-layout">
            <el-container>
                <el-aside width="200px">
                    <el-menu class="el-menu-vertical-demo">
                        <el-sub-menu index="1">
                            <template #title>
                                <!-- <el-icon>
                                    <location />
                                </el-icon> -->
                                <span>模拟器</span>
                            </template>
                            <div v-for="simulator in simulatorList" :key="simulator">
                                <el-menu-item :index="simulator" @click="switchSimulator(simulator)">{{ simulator }}</el-menu-item>
                            </div>
                            
                        </el-sub-menu>
                    </el-menu>
                </el-aside>
                <el-main>
                    <el-space wrap>
                        <el-card style="width: 300px" class="box-card" v-for="game in gameList" :key="game.id"
                            @click="launchGame(game.id)">
                            <el-image style="width: 200px; height: 200px" :src="game.info.cover" fit="contain" />
                            <div>{{ game.info.name }}</div>
                        </el-card>
                    </el-space>
                </el-main>
            </el-container>

        </div>

    </div>
</template>

<script setup lang="ts" name="GameList">
import { onMounted, reactive } from 'vue';
import { type Game } from '../types/index';
// import icon from '../../../../resources/icon.png'

let gameList = reactive<Game[]>([])
let simulatorList = ['PSP', 'GBA']

onMounted(() => {
    listenerFolder()
    init();
})

function switchSimulator(simulator) {
    console.log(simulator)
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
                readIsoCover(item.id).then((data) => {
                    if (data == null) {
                        return
                    }
                    const blob = new Blob([data], { type: 'image/jpeg' });
                    const url = URL.createObjectURL(blob);
                    console.log("cover=", url)
                    let gameItem = gameList.find(itemm => itemm.id === item.id)
                    gameItem!.info.cover = url
                    // game.info.cover = url;
                    console.log(gameList)
                })

                readIsoName(item.id).then((data) => {
                    console.log("name=", data)
                    let gameItem = gameList.find(itemm => itemm.id === item.id)
                    gameItem!.info.name = data
                    // game.info.name = data;
                    console.log(gameList)
                })
            }
        })
    });
}

async function init() {
    let list = await readDirectory()
    list.forEach((fileName: string) => {
        let game = {
            id: fileName,
            info: {
                cover: "",
                name: ""
            }
        }

        gameList.push(game)
        console.log(gameList)
        readIsoCover(fileName).then((data) => {
            if (data == null) {
                return
            }
            const blob = new Blob([data], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            console.log("cover=", url)
            let gameItem = gameList.find(item => item.id === fileName)
            gameItem!.info.cover = url
            // game.info.cover = url;
            console.log(gameList)
        })

        readIsoName(fileName).then((data) => {
            console.log("name=", data)
            let gameItem = gameList.find(item => item.id === fileName)
            gameItem!.info.name = data
            // game.info.name = data;
            console.log(gameList)
        })
    })
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