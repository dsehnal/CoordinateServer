/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as Queries from './queries'
import * as Api from './api'
import Logger from '../utils/logger'
import * as Provider from '../data/provider'

import * as fs from 'fs'
import * as path from 'path'

export interface LocalApiJob {
    inputFilename: string;
    outputFilename: string;
    query: string;
    params: { [key: string]: string };
}

export type LocalApiWorkload = LocalApiJob[]

function makeDir(path: string, root?: string): boolean {
    let dirs = path.split(/\/|\\/g),
        dir = dirs.shift();

    root = (root || '') + dir + '/';

    try { fs.mkdirSync(root); }
    catch (e) {
        if (!fs.statSync(root).isDirectory()) throw new Error(e);
    }

    return !dirs.length || makeDir(dirs.join('/'), root);
}

function createFile(name: string) {
    let dir = path.dirname(name);
    makeDir(dir);
    return fs.createWriteStream(name, { encoding: 'utf8' });
}

function execute(job: LocalApiJob, query: Queries.ApiQuery, molecule: Provider.MoleculeWrapper, params: any) {
    Api.executeQuery(molecule, query, params, () => {
        return createFile(job.outputFilename);
    });
}

function runJob(jobIndex: number, workload: LocalApiWorkload) {

    let jobCount = workload.length;
    if (jobIndex >= jobCount) {
        return;
    }

    let job = workload[jobIndex];
    let batchSize = 1;
    while (jobIndex + batchSize < jobCount
        && workload[jobIndex + batchSize].inputFilename === job.inputFilename) {
        batchSize++;
    }
    
    let filename = job.inputFilename;
    
    Provider.readMolecule(filename,
        (parserErr, m) => {
            if (parserErr) {
                Logger.error(`Parser error (${filename}): ${parserErr}, all jobs with inputFilename skipped.`);
                return;
            }
            for (let i = jobIndex; i < jobIndex + batchSize; i++) {
                job = workload[i];
                let query = {
                    name: job.query,
                    description: Queries.getQueryByName(job.query)
                };
                execute(job, query, m!, job.params);
            }
        },
        ioErr => {
            Logger.error(`IO error (${filename}): ${ioErr}, all jobs with inputFilename skipped.`);
        },
        unexpectedErr => {
            Logger.error(`Unexpected error: ${unexpectedErr}`);
        },
        () => {
            runJob(jobIndex + batchSize, workload);
        });

}

export function run(workload: LocalApiWorkload) {

    let missing = new Set<string>();
    let filtered = workload.filter(job => {
        let q = !!Queries.getQueryByName(job.query);
        if (!q) missing.add(job.query);
        return q;
    });

    if (missing.size) {
        let list: string[] = [];
        missing.forEach(q => list.push(q));
        Logger.error(`Queries '${list.join(', ')}' not found. Ignoring all jobs with this query.`);
    }
        
    if (!filtered.length) {
        Logger.log('No jobs to run...');
        return;
    }

    filtered.sort(function (a, b) { return a.inputFilename < b.inputFilename ? -1 : a.inputFilename > b.inputFilename ? 1 : 0 });
    runJob(0, filtered);
}