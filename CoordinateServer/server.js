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
"use strict";
var express = require('express');
var compression = require('compression');
var ServerConfig_1 = require('./ServerConfig');
var Core = require('LiteMol-core');
var Api_1 = require('./Api');
var Experimental_1 = require('./Experimental');
var port = process.env.port || ServerConfig_1.default.defaultPort;
function startServer() {
    var app = express();
    app.use(compression());
    var api = new Api_1.default(app);
    app.get(ServerConfig_1.default.appPrefix + '/documentation', function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(api.documentationHTML);
        res.end();
    });
    api.init();
    var experimental = new Experimental_1.default(app);
    experimental.init();
    app.get('*', function (req, res) {
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
if (ServerConfig_1.default.useCluster) {
    var cluster = require('cluster');
    if (cluster.isMaster) {
        var numCPUs = require('os').cpus().length;
        for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
        console.log("LiteMol Coordinate Server (" + Api_1.default.VERSION + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ")");
        console.log("(c) 2016 David Sehnal");
        console.log("");
        console.log("The server is running on port " + port + ", using " + numCPUs + " core(s).");
        console.log("");
    }
    else {
        startServer();
    }
}
else {
    startServer();
    console.log("LiteMol Coordinate Server (" + Api_1.default.VERSION + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ")");
    console.log("(c) 2016 David Sehnal");
    console.log("");
    console.log("The server is running on port " + port + ".");
    console.log("");
}
