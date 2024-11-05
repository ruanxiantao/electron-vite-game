export interface Game{
    id: string,
    info: GameInfo
}

export interface GameInfo {
    cover: string
    name: string
    path: string
}
