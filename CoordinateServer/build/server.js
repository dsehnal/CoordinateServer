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
var WebApi = require('./Api/WebApi');
var Experimental_1 = require('./Experimental');
var Version_1 = require('./Api/Version');
var Documentation = require('./Api/Documentation');
var Logger_1 = require('./Utils/Logger');
var port = process.env.port || ServerConfig_1.default.defaultPort;
function setupShutdown() {
    if (ServerConfig_1.default.shutdownParams.timeoutVarianceMinutes > ServerConfig_1.default.shutdownParams.timeoutMinutes) {
        Logger_1.default.log('Server shutdown timeout variance is greater than the timer itself, ignoring.');
    }
    else {
        var tVar = 0;
        if (ServerConfig_1.default.shutdownParams.timeoutVarianceMinutes > 0) {
            tVar = 2 * (Math.random() - 0.5) * ServerConfig_1.default.shutdownParams.timeoutVarianceMinutes;
        }
        var tMs = (ServerConfig_1.default.shutdownParams.timeoutMinutes + tVar) * 60 * 1000;
        console.log("----------------------------------------------------------------------------");
        console.log("  The server will shut down in " + Core.Utils.PerformanceMonitor.format(tMs) + " to prevent slow performance.");
        console.log("  Please make sure a daemon is running that will automatically restart it.");
        console.log("----------------------------------------------------------------------------");
        console.log();
        setTimeout(function () {
            if (WebApi.ApiState.pendingQueries > 0) {
                WebApi.ApiState.shutdownOnZeroPending = true;
            }
            else {
                Logger_1.default.log("Shut down due to timeout.");
                process.exit(0);
            }
        }, tMs);
    }
}
function startServer() {
    var app = express();
    app.use(compression({ level: 6, memLevel: 9, chunkSize: 16 * 16384, filter: function () { return true; } }));
    app.get(ServerConfig_1.default.appPrefix + '/documentation', function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(Documentation.getHTMLDocs(ServerConfig_1.default.appPrefix));
        res.end();
    });
    WebApi.init(app);
    var experimental = new Experimental_1.default(app);
    experimental.init();
    app.get('*', function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(Documentation.getHTMLDocs(ServerConfig_1.default.appPrefix));
        res.end();
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
        console.log("LiteMol Coordinate Server (API " + Version_1.default + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ")");
        console.log("(c) 2016 David Sehnal");
        console.log("");
        console.log("The server is running on port " + port + ", using " + numCPUs + " core(s).");
        console.log("");
    }
    else {
        startServer();
        if (ServerConfig_1.default.shutdownParams && ServerConfig_1.default.shutdownParams.timeoutMinutes > 0) {
            setupShutdown();
        }
    }
}
else {
    startServer();
    console.log("LiteMol Coordinate Server (API " + Version_1.default + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ")");
    console.log("(c) 2016 David Sehnal");
    console.log("");
    console.log("The server is running on port " + port + ".");
    console.log("");
    if (ServerConfig_1.default.shutdownParams && ServerConfig_1.default.shutdownParams.timeoutMinutes > 0) {
        setupShutdown();
    }
}
