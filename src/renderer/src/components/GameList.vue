<template>
    <div>
        <div class="common-layout">
            <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
                <el-input v-model="searchword" style="width: 240px; " placeholder="请输入游戏名称" />
            </div>

            <el-scrollbar height="400px">
                <el-space direction="vertical">
                    <div v-for="game in gameList" :key="game.id">
                        <el-card v-if="isShow(game.info.name)" style="width: 800px;"
                            class="box-card" @click="launchGame(game.id)">
                            <div style="display: flex; align-items: center;">
                                <el-image :src="game.info.cover" fit="contain" style="margin-right: 10px;" />
                                <span style="font-weight: bold;">{{ game.info.name }}</span>
                            </div>
                        </el-card>
                    </div>
                </el-space>
            </el-scrollbar>

            <div style="display: flex; justify-content: right; align-items: center; margin-top: 50px;">
                <span>共{{ gamecount }}个游戏</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="GameList">
import { onMounted, reactive, ref, computed } from 'vue';
import { type Game } from '../types/index';
// import icon from '../../../../resources/icon.png'

let gameList = reactive<Game[]>([])
let searchword = ref('')
let gamecount = computed(() => {
    return gameList.filter(game => isShow(game.info.name)).length;
})

onMounted(() => {
    listenerFolder()
    init();
})

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