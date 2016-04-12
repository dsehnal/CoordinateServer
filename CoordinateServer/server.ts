/*
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
import * as compression from 'compression'

import ServerConfig from './ServerConfig'
import * as Core from 'LiteMol-core'
import Api from './Api'
import ExperimentalApi from './Experimental'

let port = process.env.port || ServerConfig.defaultPort;

function startServer() {
    let app = express();
    app.use(compression());

    let api = new Api(app);

    app.get(ServerConfig.appPrefix + '/documentation', (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(api.documentationHTML);
        res.end();
    });

    api.init();

    let experimental = new ExperimentalApi(app);
    experimental.init();

    app.get('*', (req, res) => {

        //fs.readFile('./default.html', 'binary', function (err, file) {
        //if (err) {
        //    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        //    res.write(err + '\n');
        //    res.end();
        //    return;
        //}

        res.writeHead(200, { 'Content-Type': 'text/html' });
        //res.write(file, 'binary');
        res.write(api.documentationHTML);
        res.end();
        //});
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

        console.log(`LiteMol Coordinate Server (${Api.VERSION}, core ${Core.VERSION.number} - ${Core.VERSION.date})`);
        console.log(`(c) 2016 David Sehnal`);
        console.log(``);
        console.log(`The server is running on port ${port}, using ${numCPUs} core(s).`);
        console.log(``);

    } else {
        startServer();
    }

} else {

    startServer();
    console.log(`LiteMol Coordinate Server (${Api.VERSION}, core ${Core.VERSION.number} - ${Core.VERSION.date})`);
    console.log(`(c) 2016 David Sehnal`);
    console.log(``);
    console.log(`The server is running on port ${port}.`);
    console.log(``);
}
