"use strict";
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var compression = require("compression");
var server_config_1 = require("./server-config");
var Core = require("./lib/LiteMol-core");
var WebApi = require("./api/web-api");
var version_1 = require("./api/version");
var Documentation = require("./api/documentation");
var logger_1 = require("./utils/logger");
var port = process.env.port || server_config_1.default.defaultPort;
function setupShutdown() {
    if (server_config_1.default.shutdownParams.timeoutVarianceMinutes > server_config_1.default.shutdownParams.timeoutMinutes) {
        logger_1.default.log('Server shutdown timeout variance is greater than the timer itself, ignoring.');
    }
    else {
        var tVar = 0;
        if (server_config_1.default.shutdownParams.timeoutVarianceMinutes > 0) {
            tVar = 2 * (Math.random() - 0.5) * server_config_1.default.shutdownParams.timeoutVarianceMinutes;
        }
        var tMs = (server_config_1.default.shutdownParams.timeoutMinutes + tVar) * 60 * 1000;
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
                logger_1.default.log("Shut down due to timeout.");
                process.exit(0);
            }
        }, tMs);
    }
}
function startServer() {
    var app = express();
    app.use(compression({ level: 6, memLevel: 9, chunkSize: 16 * 16384, filter: function () { return true; } }));
    app.get(server_config_1.default.appPrefix + '/documentation', function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(Documentation.getHTMLDocs(server_config_1.default.appPrefix));
        res.end();
    });
    WebApi.init(app);
    app.get('*', function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(Documentation.getHTMLDocs(server_config_1.default.appPrefix));
        res.end();
    });
    app.listen(port);
}
if (server_config_1.default.useCluster) {
    var cluster = require('cluster');
    if (cluster.isMaster) {
        var numCPUs = require('os').cpus().length;
        for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
        console.log("LiteMol Coordinate Server (API " + version_1.default + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ")");
        console.log("(c) 2016 David Sehnal");
        console.log("");
        console.log("The server is running on port " + port + ", using " + numCPUs + " core(s).");
        console.log("");
    }
    else {
        startServer();
        if (server_config_1.default.shutdownParams && server_config_1.default.shutdownParams.timeoutMinutes > 0) {
            setupShutdown();
        }
    }
}
else {
    startServer();
    console.log("LiteMol Coordinate Server (API " + version_1.default + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ")");
    console.log("(c) 2016 - now David Sehnal");
    console.log("");
    console.log("The server is running on port " + port + ".");
    console.log("");
    if (server_config_1.default.shutdownParams && server_config_1.default.shutdownParams.timeoutMinutes > 0) {
        setupShutdown();
    }
}
