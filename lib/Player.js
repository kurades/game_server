export default class Player{

    static = {
      id: -1,
      connection: null,
      username: '',
      health: 100,
      roomName: '',
      pos: {
        x: 0, y: 0
      }
    }
  
    constructor(connection, username){
      this.static.connection = connection
      this.static.username = username
    }
  
    getConnection = () => this.static.connection
    setConnection = (ws) => { this.static.connection = ws }

    getRoomName = () => this.static.roomName
    setRoomName = (roomName) => { this.static.roomName = roomName }
  
    getId = () => this.static.id
    setId = (id) => { this.static.id = id }
  
    getUsername = () => this.static.username
    setUsername = (username) => { this.static.username = username }
  
    getHealth = () => this.static.health
    setHealth = (health) => { this.static.health = health }
  
    getPos = () => this.static.pos
    setPos = (pos) => { this.static.pos = pos }
    setPos = (x,y) => { this.static.pos = {x,y} }
  }