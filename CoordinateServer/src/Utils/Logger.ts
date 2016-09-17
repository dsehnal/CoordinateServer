

export default class Logger {

    static log(msg: string) {
        console.log(`[${new Date().toLocaleString('en-US')}] ${msg}`);
    }
    
    static error(msg: string) {
        console.error(`[${new Date().toLocaleString('en-US')}] ${msg}`);
    }
}