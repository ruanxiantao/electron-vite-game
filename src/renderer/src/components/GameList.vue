<template>
    <div>
        <el-card style="max-width: 480px" v-for="game in gameList" :key="game.id" @click="launchGame(game.id)">
            <h1>aaa</h1>
            <img :src="game.info.cover" style="width: 100%" />
            <span>{{ game.info.name }}</span>
        </el-card>
    </div>
</template>

<script setup lang="ts" name="GameList">
import { onMounted, reactive } from 'vue';
import { type Game } from '../types/index';
// import icon from '../../../../resources/icon.png'

let gameList = reactive<Game[]>([])

onMounted(() => {
    listenerFolder()
    init();
})

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