/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as express from 'express'
import * as compression from 'compression'

import ServerConfig from './server-config'
import * as Core from './lib/LiteMol-core'
import * as WebApi from './api/web-api'
import ApiVersion from './api/version'
import * as Documentation from './api/documentation'
import Logger from './utils/logger'

let port = process.env.port || ServerConfig.defaultPort;

function setupShutdown() {
    if (ServerConfig.shutdownParams.timeoutVarianceMinutes > ServerConfig.shutdownParams.timeoutMinutes) {
        Logger.log('Server shutdown timeout variance is greater than the timer itself, ignoring.');
    } else {
        let tVar = 0;
        if (ServerConfig.shutdownParams.timeoutVarianceMinutes > 0) {
            tVar = 2 * (Math.random() - 0.5) * ServerConfig.shutdownParams.timeoutVarianceMinutes;
        }
        let tMs = (ServerConfig.shutdownParams.timeoutMinutes + tVar) * 60 * 1000;

        console.log(`----------------------------------------------------------------------------`);
        console.log(`  The server will shut down in ${Core.Utils.PerformanceMonitor.format(tMs)} to prevent slow performance.`);
        console.log(`  Please make sure a daemon is running that will automatically restart it.`);
        console.log(`----------------------------------------------------------------------------`);
        console.log();

        setTimeout(() => {
            if (WebApi.ApiState.pendingQueries > 0) {
                WebApi.ApiState.shutdownOnZeroPending = true;
            } else {
                Logger.log(`Shut down due to timeout.`);
                process.exit(0);
            }
        }, tMs);
    }
}

function startServer() {
    let app = express();
    app.use(compression(<any>{ level: 6, memLevel: 9, chunkSize: 16 * 16384, filter: () => true }));
    
    app.get(ServerConfig.appPrefix + '/documentation', (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(Documentation.getHTMLDocs(ServerConfig.appPrefix));
        res.end();
    });

    WebApi.init(app);
    
    app.get('*', (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(Documentation.getHTMLDocs(ServerConfig.appPrefix));
        res.end();
    });

    app.listen(port);
}

if (ServerConfig.useCluster) {
    let cluster = require('cluster');

    if (cluster.isMaster) {

        const numCPUs = require('os').cpus().length;
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        console.log(`LiteMol Coordinate Server (API ${ApiVersion}, core ${Core.VERSION.number} - ${Core.VERSION.date})`);
        console.log(`(c) 2016 David Sehnal`);
        console.log(``);
        console.log(`The server is running on port ${port}, using ${numCPUs} core(s).`);
        console.log(``);

    } else {
        startServer();

        if (ServerConfig.shutdownParams && ServerConfig.shutdownParams.timeoutMinutes > 0) {
            setupShutdown();
        }
    }

} else {
    startServer();
    console.log(`LiteMol Coordinate Server (API ${ApiVersion}, core ${Core.VERSION.number} - ${Core.VERSION.date})`);
    console.log(`(c) 2016 David Sehnal`);
    console.log(``);
    console.log(`The server is running on port ${port}.`);
    console.log(``);

    if (ServerConfig.shutdownParams && ServerConfig.shutdownParams.timeoutMinutes > 0) {
        setupShutdown();
    }
}
