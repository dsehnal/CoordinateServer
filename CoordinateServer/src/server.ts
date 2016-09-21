﻿/*
 * Copyright (c) 2016 David Sehnal
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from 'fs'
import * as express from 'express'
import * as zlib from 'zlib'
import * as compression from 'compression'

import ServerConfig from './ServerConfig'
import * as Core from 'LiteMol-core'
import * as WebApi from './Api/WebApi'
import ExperimentalApi from './Experimental'
import ApiVersion from './Api/Version'
import * as Queries from './Api/Queries'
import * as Documentation from './Api/Documentation'

let port = process.env.port || ServerConfig.defaultPort;

function startServer() {
    let app = express();
    app.use(compression(<any>{ level: 6, memLevel: 9, chunkSize: 16 * 16384, filter: () => true }));
    
    app.get(ServerConfig.appPrefix + '/documentation', (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(Documentation.getHTMLDocs(ServerConfig.appPrefix));
        res.end();
    });

    WebApi.init(app);

    let experimental = new ExperimentalApi(app);
    experimental.init();

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
    }

} else {

    startServer();
    console.log(`LiteMol Coordinate Server (API ${ApiVersion}, core ${Core.VERSION.number} - ${Core.VERSION.date})`);
    console.log(`(c) 2016 David Sehnal`);
    console.log(``);
    console.log(`The server is running on port ${port}.`);
    console.log(``);
}