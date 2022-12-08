import Bootstrap from './Bootstrap.js'
import {WebSocketServer, WebSocket } from 'ws'
import localIpV4Address from 'local-ipv4-address'
import gdCom from '@gd-com/utils'
import Slots from './Slots.js'
import Player from './Player.js'
import Room from './Room.js'

export default class Server extends Bootstrap {

    static = {
        wss: null,
        width: 624,
        height: 304
    }

    rooms = new Array()

    slots = new Slots()

    constructor() {
        super()
        localIpV4Address()
        .then((ipAddress) => this.onInit(ipAddress))
    }

    onInit = (ip) => {
        this.showLog(`> Creating the WebSocket Server in 127.0.0.1:${this.config.SERVER_PORT | process.env.PORT}`, true)
        this.showLog(`> Connections over the local network: ${ip != undefined ? ip : 'disabled'}:${this.config.SERVER_PORT | process.env.PORT}`, true)
        this.static.wss = new WebSocketServer({
            port: this.config.SERVER_PORT
        })
        this.showLog("> Server starting...")
        this.onServerInit()
    }

    onServerInit = () => {
        this.static.wss.on('connection', (ws, req) => {
            this.showLog(`> New connection attempt ${req.socket.remoteAddress}`)

            ws.on('message', (message) => {
                let receiveBuff = Buffer.from(message)
                let receive = gdCom.getVar(receiveBuff)
                let type = receive.value.type
                const player = this.slots.clients[ws.id]
                const data = receive.value;

                if (type == "OnPlayerAuth") {
                    return this.onAuth(ws, data.data)
                } else if (type == "OnCreateRoom") {
                    return this.onCreateRoom(ws)
                } else if (type == "onJoinRoom") {
                    return this.onJoinRoom(data.roomName, player)
                } else if (type == "onGetRoomPlayers") {
                    return this.onGetRoomPlayers(data.roomName, ws)
                } else if (type == "onLeftRoom") {
                    return this.onLeftRoom(player.getRoomName(), player)
                } else if (type == "onStartGame") {
                    return this.onStartGame(data.roomName)
                } else if (type == "onUpdatePos") {
                    return this.onUpdatePos(data.data.username, data.data.x, data.data.y, data.data.animation, player.getRoomName())
                } else if (type == "onDropBomb") {
                    return this.onDropBomb(data.data.x, data.data.y, data.data.bombRange, data.data.username, player.getRoomName())
                } else if (type == "onChat") {
                    return this.onChat(player, data.message)
                }
            })

            ws.on('close', e => {
                this.onLogOut(ws)
            })
        })
    }

    onAuth = (ws, data) => {
        const player = new Player(ws, data.username)
    
        if(this.slots.isFull()){
            return this.kick(player, 'Sorry. The server is full, please try again later!')
        }else if(this.config.white_list == true && this.static.whitelist.find(username => username == data.username) == undefined){
            return this.kick(player, 'Sorry. You are not on the Whitelist!')
        }else if(this.slots.isPlayerOnline(data.username)){
            return this.kick(player, `Sorry. The name ${data.username} is already in use!`)
        }else{
    
            this.slots.push(player)
            this.showLog(`> ${data.username} joined the game!`, true)
        
            ws.id = player.getId()
            this.loadRoomsOneClient(ws)
        }
    }

    onCreateRoom = (ws) => {
        if (this.rooms.length >= 10) return;
        var newRoom = new Room()
        const player = this.slots.clients[ws.id]
        const roomName = `Room of ${player.getUsername()}`
        player.setRoomName(roomName)
        newRoom.setRoomName(roomName)
        newRoom.join(player)
        this.rooms.push(newRoom)
        this.loadRoomsAllClient()
    }

    loadRoomsAllClient = () => {
        this.slots.clients.forEach((client) => {
            if (client != null) {
                const ws = client.getConnection()
                this.loadRoomsOneClient(ws)
            } 
        })
    }

    loadRoomsOneClient = (ws) => {
        const roomsData = this.getRoomsData()
        ws.send(JSON.stringify({
            type: 'updateRoom',
            data: roomsData
        }))
    }

    onGetRoomPlayers = (roomName, ws) => {
        const room = this.findRoom(roomName)
        if (room == null) return
        const players = this.getRoomPlayers(room)
        ws.send(JSON.stringify({
            type: 'loadRoom',
            players: players
        }))
    }

    getRoomsData = () => {
        const roomsData = []
        this.rooms.forEach((room) => {
            if (!room.getStarted()) {
                const players = this.getRoomPlayers(room)
                roomsData.push({
                    "roomName": room.static.name,
                    "length": room.static.length,
                    "players": players
                })
            }
        })
        return roomsData
    }

    getRoomPlayers = (room) => {
        const players = []
        room.players.forEach((player) => {
            players.push({
                username: player.getUsername()
            })
        })
        return players
    }

    onJoinRoom = (roomName, player) => {
        const room = this.findRoom(roomName)
        if (room == null) return
        player.setRoomName(roomName)
        room.join(player)
        this.loadRoomsAllClient()
    }

    onLeftRoom = (roomName, player) => {
        const room = this.findRoom(roomName)
        if (room == null) return
        player.setRoomName("")
        for (let j=0; j<room.players.length; ++j) {
            if (room.players[j].getUsername() == player.getUsername()) {
                room.players.splice(j, 1)
                room.static.length--
                if (j == 0 && !room.getStarted()) {
                    this.removeRoom(roomName)
                }
                break
            }
        }
        if (room.players.length == 0) {
            this.removeRoom(roomName)
            return
        }
        
        if (room.getStarted()) {
            room.players.forEach((p) => {
                if (p.getUsername() != player.getUsername()) {
                    const ws = p.getConnection()
                    ws.send(JSON.stringify({
                        type: 'removePlayer',
                        username: player.getUsername()
                    }))
                    ws.send(JSON.stringify({
                        type: 'chat',
                        data: {
                            message: `Game: ${player.getUsername()} exited`,
                            color: "#00FF00"
                        }   
                    }))
                }
            })
        }
        this.loadRoomsAllClient()
    }

    findRoom = (roomName) => {
        for (let i=0; i<this.rooms.length; ++i) 
            if (this.rooms[i].getRoomName() == roomName)
                return this.rooms[i]
        return null
    }

    removeRoom = (roomName) => {
        for (let i=0; i<this.rooms.length; ++i) 
            if (this.rooms[i].getRoomName() == roomName)
                this.rooms.splice(i, 1)
        this.loadRoomsAllClient()
    }

    onStartGame = (roomName) => {
        const room = this.findRoom(roomName)
        if (room == null) return
        const stonesAndItems = this.generateStonesAndItems()
        room.setStarted(true)
        this.loadRoomsAllClient()
        room.players.forEach((player, index) => {
            const ws = player.getConnection()
            ws.send(JSON.stringify({
                type: 'startGame',
                data: {
                    blocks: stonesAndItems,
                    players: this.getPlayerStatus(room, ws)
                }
            }))
            room.players.forEach((_player, _index) => {
                ws.send(JSON.stringify({
                    type: 'chat',
                    data: {
                        message: `Game: ${_player.getUsername()} joined`,
                        color: "#00FF00"
                    }
                    
                }))
            })
        })
    }

    getPlayerStatus = (room, ws) => {
        const data = []
        const pos = [
            {
                x: 0,
                y: 0
            },
            {
                x: this.static.width - 14,
                y: 0
            },
            {
                x: 0,
                y: this.static.height - 14
            },
            {
                x: this.static.width - 14,
                y: this.static.height
            }
        ]
        room.players.forEach((player, index) => {
            data.push({
                id: index,
                username: player.getUsername(),
                pos: pos[index],
                active: ws.id == player.getId()
            })
        })
        return data
    }

    kick = (player, message = 'You have been kicked off the server!') => {
        const ws = player.getConnection()
        try {
            ws.send(JSON.stringify({
                type: 'kick',
                message: message
            }))
        
        } catch (error) {
            return this.showLog(`There was an error sending the message: ${error.message}`, true)
        }
    
        ws.close()
        this.slots.remove(player)
    }

    generateStonesAndItems = () => {
        const stones = []
        const items = []
        for (let i=16; i<this.static.width - 20; i+=16)
            for (let j=16; j<this.static.height - 20; j+=16) {
                if ((i - 16)% 32 == 0 && (j-16)%32 == 0) continue
                let rand = Math.floor(Math.random() * 10)
                if (rand > 3) {
                    stones.push({
                        "x": i,
                        "y": j
                    })
                    rand = Math.floor(Math.random() * 10)
                    if (rand < 3) {
                        items.push({
                            "x": i,
                            "y": j,
                            "type": Math.floor(Math.random() * 3)
                        })
                    }
                }
            }
        
        for (let i=32; i<this.static.height - 36; i+=16){
            let rand = Math.floor(Math.random() * 10)
            if (rand > 3) {
                stones.push({
                    "x": 0,
                    "y": i
                })
                rand = Math.floor(Math.random() * 10)
                if (rand < 3) {
                    items.push({
                        "x": 0,
                        "y": i,
                        "type": Math.floor(Math.random() * 3)
                    })
                }
            }
            
            rand = Math.floor(Math.random() * 10)
            if (rand > 3) {
                stones.push({
                    "x": 288,
                    "y": i
                })
                rand = Math.floor(Math.random() * 10)
                if (rand < 3) {
                    items.push({
                        "x": 288,
                        "y": i,
                        "type": Math.floor(Math.random() * 3)
                    })
                }
            }
           
        }
        for (let i=32; i<this.static.width - 36; i+=16) {
            let rand = Math.floor(Math.random() * 10)
            if (rand > 3) {
                stones.push({
                    "x": i,
                    "y": 0
                })
                rand = Math.floor(Math.random() * 10)
                if (rand < 3) {
                    items.push({
                        "x": i,
                        "y": 0,
                        "type": Math.floor(Math.random() * 3)
                    })
                }
            }
            

            rand = Math.floor(Math.random() * 10)
            if (rand > 3) {
                stones.push({
                    "x": i,
                    "y": 288
                })
                rand = Math.floor(Math.random() * 10)
                if (rand < 3) {
                    items.push({
                        "x": i,
                        "y": 288,
                        "type": Math.floor(Math.random() * 3)
                    })
                }
            }
        }
        
        return {
            "stones": stones,
            "items": items
        }
    }

    onUpdatePos = (username, x, y, animation, roomName) => {
        const room = this.findRoom(roomName)
        if (room == null) return
        room.players.forEach((player) => {
            if (player.getUsername() != username) {
                const ws = player.getConnection()
                ws.send(JSON.stringify({
                    type: 'updatePos',
                    data: {
                        username: username,
                        x: x,
                        y: y,
                        animation: animation
                    }
                }))
            }
        })
    }

    onDropBomb = (x, y, bombRange, username, roomName) => {
        const room = this.findRoom(roomName)
        if (room == null) return
        
        room.players.forEach((player) => {
            const ws = player.getConnection()
            ws.send(JSON.stringify({
                type: 'dropBomb',
                data: {
                    x: x,
                    y: y,
                    bombRange: bombRange,
                    yourBomb: username === player.getUsername()
                }
            }))
        })
    }

    onChat = (player, message) => {
        const roomName = player.getRoomName()
        const room = this.findRoom(roomName)
        if (room == null) return
        room.players.forEach((_player) => {
            const ws = _player.getConnection()
            ws.send(JSON.stringify({
                type: 'chat',
                data: {
                    message: `${player.getUsername()}:  ${message}`,
                    color: "#eeeeee"
                }
            }))
        })
    }

    onLogOut = (ws) => {
        if(ws.id != undefined){
            const player = this.slots.clients[ws.id]
            this.showLog(`> ${player.getUsername()} left the game!`, true)
        
            this.onLeftRoom(player.getRoomName(), player)

            this.slots.remove(player)

            this.slots.map((client) => {
                if(client.getId() != player.getId() && client.getConnection().readyState === WebSocket.OPEN){
                    try {
                        client.getConnection().send(JSON.stringify({
                            type: 'removePlayer',
                            username: player.getUsername(),
                        }))
                    
                    } catch (error) {
                        return this.showLog(`> There was an error deleting the player: ${error.message}`, true)
                    }
                }
            })
        }
    }
}