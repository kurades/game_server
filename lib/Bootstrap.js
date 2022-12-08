import env from 'dotenv'
import AppRoot from 'app-root-path'

export default class Bootstrap {

    config = {}

    constructor() {
        this.config = this.getConfig()
    }

    showLog = (message) => {
        console.log(message)
    }

    getConfig = () => {
        if (env.config({ path: `${AppRoot.path}/.env` }).error) {
          console.error('> The .ENV file does not exist, it is extremely important for the functioning of this program.');
          console.log(`> The program was terminated due to lack of fundamental components.`)
          process.exit(0)
        } else return env.config({ path: `${AppRoot.path}/.env` }).parsed
    }
}