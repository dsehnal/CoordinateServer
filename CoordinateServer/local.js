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
var fs = require('fs');
var Core = require('LiteMol-core');
var LocalApi = require('./Api/LocalApi');
var Version_1 = require('./Api/Version');
console.log("LiteMol Coordinate Server (API " + Version_1.default + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ")");
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
        outputFilename: 'c:/test/quick/localapi/1tqn_het.cif',
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
        LocalApi.run(exampleWorkload);
    }
    catch (e) {
        console.error(e);
    }
}
//LocalApi.run(exampleWorkload);
