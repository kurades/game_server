export default class Slots{
  clients = new Array(20).fill(null)
  length = 0

  constructor(length = 10){
    this.clients = new Array(length).fill(null)
  }

  getLength(){
    return this.length
  }

  isFull(){
    return this.getLength() >= this.clients.length
  }

  push(player){
    
    return this.search((index) => {
      player.setId(index)

      this.clients[index] = player
      this.length++

      return index
    })()
  }

  remove(player){
    return this.search((index) => {
      this.clients[index] = null
      this.length--

      return 1
    }, player)()
  }

  update(func, player){
    this.clients[player.getId()] = func(this.clients[player.getId()])
  }

  search(func, object = null){
    const clients = this.clients
    
    return function findEmpty(){
      for (let i=0; i<clients.length; ++i) {
        if (clients[i] == object) return func(i, object);
      }
    }
  }

  map(func){
    const clients = this.clients
    function loop(index = 0){
      if(index >= clients.length / 2) return -1
      else{
        const reverse = (clients.length -1 ) - index

        if (clients[index] != null) func(clients[index], index)
        if (clients[reverse] != null && index != reverse) func(clients[reverse], reverse)
        
        return loop(index + 1)
      }
    }

    loop()
  }

  isPlayerOnline(username){
    const clients = this.clients

    function loop(index = 0){
      if(index >= clients.length / 2) return -1
      else{
        const reverse = (clients.length -1 ) - index

        if ( index == reverse ){
          if (clients[index] != null ){
            return clients[index].getUsername() == username  
          }else return false
        }
        else if ( clients[index] != null ){
          return clients[index].getUsername() == username
        }
        else if ( clients[reverse] != null ){
          return clients[reverse].getUsername() == username
        }
        else return loop(index + 1)
      }
    }

    return this.getLength() > 0 ? loop() : false
  }
}