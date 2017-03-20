/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as fs from 'fs'

import * as Core from './lib/LiteMol-core'
import * as LocalApi from './api/local-api'
import ApiVersion from './api/version'

console.log(`LiteMol Coordinate Server (API ${ApiVersion}, core ${Core.VERSION.number} - ${Core.VERSION.date})`);
console.log(`(c) 2016 David Sehnal`);
console.log(``);

let exampleWorkload: LocalApi.LocalApiWorkload = [
    {
        inputFilename: 'c:/test/quick/1tqn.cif',
        outputFilename: 'c:/test/quick/localapi/1tqn_het.cif',
        query: 'het', // actions are same as defined in Api/Queries
        params: {}
    }, {
        inputFilename: 'c:/test/quick/1cbs_updated.cif',
        outputFilename: 'c:/test/quick/localapi/1cbs_ligint.cif',
        query: 'ligandInteraction', // action is case sensitive
        params: { name: 'REA' }
    }, {
        inputFilename: 'c:/test/quick/1tqn.cif', // multiple files that are repeated will only be parsed once
        outputFilename: 'c:/test/quick/localapi/1tqn_residues.cif',
        query: 'residues',
        params: { name: 'ALA', atomSitesOnly: '1' } // parameters are just a JSON version of the query string
    }
];

if (process.argv.length !== 3) {
    let help = [
        `Usage: `,
        ``,
        `   node local jobs.json`,
        ``,
        `jobs.json is a JSON version of the WebAPI. Query names are case sensitive.`,
        `The jobs are automatically sorted by inputFilenama and the given file is only loaded once.`,
        `All processing errors are sent to stderr.`,
        ``,
        `Jobs example:`,
        ``,
        JSON.stringify(exampleWorkload, null, 2)
    ];

    console.log(help.join('\n'));
} else {

    try {
        let jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
        LocalApi.run(jobs);
    } catch (e) {
        console.error(e);
    }

}



//LocalApi.run(exampleWorkload);
