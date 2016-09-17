"use strict";
var Queries = require('./Queries');
var Api = require('./Api');
var Logger_1 = require('../Utils/Logger');
var Provider = require('../Data/Provider');
var fs = require('fs');
var path = require('path');
function makeDir(path, root) {
    var dirs = path.split('/'), dir = dirs.shift(), root = (root || '') + dir + '/';
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
    var id = path.basename(filename.replace(/(\.cif$)|['";]|(\.cif\.gz$)|\s/ig, ''));
    Provider.readMolecule(filename, function (parserErr, m) {
        if (parserErr) {
            Logger_1.default.error("Parser error (" + filename + "): " + parserErr + ", all jobs with inputFilename skipped.");
            return;
        }
        for (var i = jobIndex; i < jobIndex + batchSize; i++) {
            job = workload[i];
            var query = {
                name: job.query,
                description: Queries.QueryMap[job.query]
            };
            execute(job, query, m, job.params);
        }
    }, function (ioErr) {
        Logger_1.default.error("IO error (" + filename + "): " + ioErr + ", all jobs with inputFilename skipped.");
    }, function (unexpectedErr) {
        Logger_1.default.error("Unexpected error: " + unexpectedErr);
    }, function () {
        runJob(jobIndex + batchSize, workload);
    });
}
function run(workload) {
    var missing = new Set();
    var filtered = workload.filter(function (job) {
        var q = !!Queries.QueryMap[job.query];
        if (!q)
            missing.add(job.query);
        return q;
    });
    if (missing.size) {
        var list_1 = [];
        missing.forEach(function (q) { return list_1.push(q); });
        Logger_1.default.error("Queries '" + list_1.join(', ') + "' not found. Ignoring all jobs with this query.");
    }
    if (!filtered.length) {
        Logger_1.default.log('No jobs to run...');
        return;
    }
    filtered.sort(function (a, b) { return a.inputFilename < b.inputFilename ? -1 : a.inputFilename > b.inputFilename ? 1 : 0; });
    runJob(0, filtered);
}
exports.run = run;
