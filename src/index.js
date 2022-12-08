import { Server } from '../lib/Multiplayer.js'
import { EventEmitter } from 'events'

global.eventServer = new EventEmitter()

const server = new Server()