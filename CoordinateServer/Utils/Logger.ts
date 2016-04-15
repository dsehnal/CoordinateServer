

export default class Logger {

    static log(msg: string) {
        console.log(`[${new Date().toLocaleString('us')}] ${msg}`);
    }
    
    static error(msg: string) {
        console.error(`[${new Date().toLocaleString('us')}] ${msg}`);
    }
}