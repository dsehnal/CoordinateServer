"use strict";
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Queries = require("./queries");
var Api = require("./api");
var logger_1 = require("../utils/logger");
var Provider = require("../data/provider");
var fs = require("fs");
var path = require("path");
function makeDir(path, root) {
    var dirs = path.split(/\/|\\/g), dir = dirs.shift();
    root = (root || '') + dir + '/';
    try {
        fs.mkdirSync(root);
    }
    catch (e) {
        if (!fs.statSync(root).isDirectory())
            throw new Error(e);
    }
    return !dirs.length || makeDir(dirs.join('/'), root);
}
function createFile(name) {
    var dir = path.dirname(name);
    makeDir(dir);
    return fs.createWriteStream(name, { encoding: 'utf8' });
}
function execute(job, query, molecule, params) {
    Api.executeQuery(molecule, query, params, function () {
        return createFile(job.outputFilename);
    });
}
function runJob(jobIndex, workload) {
    var jobCount = workload.length;
    if (jobIndex >= jobCount) {
        return;
    }
    var job = workload[jobIndex];
    var batchSize = 1;
    while (jobIndex + batchSize < jobCount
        && workload[jobIndex + batchSize].inputFilename === job.inputFilename) {
        batchSize++;
    }
    var filename = job.inputFilename;
    logger_1.default.log("[local] Reading '" + filename + "'...");
    Provider.readMolecule(filename, function (parserErr, m) {
        if (parserErr) {
            logger_1.default.error("Parser error (" + filename + "): " + parserErr + ", all jobs with inputFilename skipped.");
            return;
        }
        for (var i = jobIndex; i < jobIndex + batchSize; i++) {
            job = workload[i];
            var query = {
                name: job.query,
                description: Queries.getQueryByName(job.query)
            };
            execute(job, query, m, job.params);
        }
    }, function (ioErr) {
        logger_1.default.error("IO error (" + filename + "): " + ioErr + ", all jobs with inputFilename skipped.");
    }, function (unexpectedErr) {
        logger_1.default.error("Unexpected error (" + filename + "): " + unexpectedErr);
    }, function () {
        runJob(jobIndex + batchSize, workload);
    });
}
function run(workload) {
    var missing = new Set();
    var filtered = workload.filter(function (job) {
        var q = !!Queries.getQueryByName(job.query);
        if (!q)
            missing.add(job.query);
        return q;
    });
    if (missing.size) {
        var list_1 = [];
        missing.forEach(function (q) { return list_1.push(q); });
        logger_1.default.error("Queries '" + list_1.join(', ') + "' not found. Ignoring all jobs with this query.");
    }
    if (!filtered.length) {
        logger_1.default.log('No jobs to run...');
        return;
    }
    filtered.sort(function (a, b) { return a.inputFilename < b.inputFilename ? -1 : a.inputFilename > b.inputFilename ? 1 : 0; });
    runJob(0, filtered);
}
exports.run = run;
