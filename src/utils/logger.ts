/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

export default class Logger {
    static getDateString() {
        return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    }

    static log(msg: string) {
        console.log(`[${Logger.getDateString()}] ${msg}`);
    }
    
    static error(msg: string) {
        console.error(`[${Logger.getDateString()}] ${msg}`);
    }
}