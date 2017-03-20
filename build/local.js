/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var Core = require("./lib/LiteMol-core");
var LocalApi = require("./api/local-api");
var version_1 = require("./api/version");
console.log("LiteMol Coordinate Server (API " + version_1.default + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ")");
console.log("(c) 2016 David Sehnal");
console.log("");
var exampleWorkload = [
    {
        inputFilename: 'c:/test/quick/1tqn.cif',
        outputFilename: 'c:/test/quick/localapi/1tqn_het.cif',
        query: 'het',
        params: {}
    }, {
        inputFilename: 'c:/test/quick/1cbs_updated.cif',
        outputFilename: 'c:/test/quick/localapi/1cbs_ligint.cif',
        query: 'ligandInteraction',
        params: { name: 'REA' }
    }, {
        inputFilename: 'c:/test/quick/1tqn.cif',
        outputFilename: 'c:/test/quick/localapi/1tqn_residues.cif',
        query: 'residues',
        params: { name: 'ALA', atomSitesOnly: '1' } // parameters are just a JSON version of the query string
    }
];
if (process.argv.length !== 3) {
    var help = [
        "Usage: ",
        "",
        "   node local jobs.json",
        "",
        "jobs.json is a JSON version of the WebAPI. Query names are case sensitive.",
        "The jobs are automatically sorted by inputFilenama and the given file is only loaded once.",
        "All processing errors are sent to stderr.",
        "",
        "Jobs example:",
        "",
        JSON.stringify(exampleWorkload, null, 2)
    ];
    console.log(help.join('\n'));
}
else {
    try {
        var jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
        LocalApi.run(jobs);
    }
    catch (e) {
        console.error(e);
    }
}
//LocalApi.run(exampleWorkload);
