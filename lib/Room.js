export default class Room {
    players = new Array()
    static = {
        length: 0,
        name: "",
        started: false
    }

    setStarted = (started) => { this.static.started = started }

    getStarted = () => this.static.started

    getPlayerNumber = () => this.static.length

    getRoomName = () => this.static.name

    setRoomName = (roomName) => { this.static.name = roomName }
   
    join(player) {
        if (this.isFull()) return;
        this.players.push(player)
        this.static.length++
    }

    isFull() {
        return this.static.length >= 4
    }

    out(player) {
        for (let i=0; i<4; ++i) {
            if (this.players[i] == player) {
                this.players[i] = null;
                break;
            }
        }
    }
}