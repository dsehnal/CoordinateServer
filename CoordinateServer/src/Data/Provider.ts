
import * as Core from 'LiteMol-core'
import * as Molecule from './Molecule'
import * as fs from 'fs'
import * as zlib from 'zlib'
import Logger from '../Utils/Logger';

import CIF = Core.Formats.CIF;
import mmCIF = Core.Formats.Molecule.mmCIF;

export enum MoleculeSource {
    File,
    Cache
}

export class MoleculeWrapper {
    constructor(public molecule: Molecule.Molecule, public source: MoleculeSource, public ioTime: number, public parseTime: number) {
    }
}

function readString(filename: string, onDone: (err: any, data: string | undefined) => void) {
    let isGz = /\.gz$/i.test(filename);
    if (isGz) {
        fs.readFile(filename, (err, raw) => {
            if (err) {
                onDone(err, void 0);
                return;
            }            
            zlib.unzip(raw, (e, data) => {
                if (e) {
                    onDone(e, void 0);
                    return;
                }

                let s = data.toString('utf8');
                onDone(void 0, s);
            });
        });
    } else {
        fs.readFile(filename, 'utf8', onDone);
    }
}

interface ReadResolver  {
    perf: Core.Utils.PerformanceMonitor,
    onParsed: (err: string | undefined, m: MoleculeWrapper | undefined) => void,
    onIOError: (err: string) => void,
    onUnexpectedError: (err: string) => void,
    onIOfinished ?: () => void
}

const resolvers = new Map<string, ReadResolver[]>();

function resolve(filename: string, err: any, data: string | undefined) {
    let toResolve = resolvers.get(filename);
    if (!toResolve) {
        Logger.error(`No resolvers found for '${filename}'.`);
        return;
    }
    resolvers.delete(filename);


    try {
        let res = toResolve[0];
        if (res.onIOfinished) res.onIOfinished();

        if (err) {
            for (let i = 0; i < toResolve.length; i++) {
                toResolve[i].onIOError('' + err);
            }
            return;
        }
        
        res.perf.start('parse');
        let dict = CIF.Text.parse(data!);

        if (dict.error) {
            let error = dict.error.toString();
            for (let i = 0; i < toResolve.length; i++) {
                toResolve[i].onParsed(error, undefined);
            }
            return;
        }

        if (!dict.result!.dataBlocks.length) {
            let error = 'The input contains no data blocks.';
            for (let i = 0; i < toResolve.length; i++) {
                toResolve[i].onParsed(error, undefined);
            }
            return;
        }

        let block = dict.result!.dataBlocks[0];
        let rawMol = mmCIF.ofDataBlock(block);
        res.perf.end('parse');

        let mol = new Molecule.Molecule(Molecule.Molecule.createKey(filename), block, rawMol, data!.length);
        res.onParsed(undefined, new MoleculeWrapper(mol, MoleculeSource.File, res.perf.time('io'), res.perf.time('parse')));
        let cached = new MoleculeWrapper(mol, MoleculeSource.Cache, 0, 0);;
        for (let i = 1; i < toResolve.length; i++) {
            toResolve[i].onParsed(undefined, cached);
        }
    } catch (e) {
        let error = '' + e;
        for (let i = 0; i < toResolve.length; i++) {
            toResolve[i].onUnexpectedError(error);
        }
    }
}

export function readMolecule(filename: string,
    onParsed: (err: string | undefined, m: MoleculeWrapper | undefined) => void,
    onIOError: (err: string) => void,
    onUnexpectedError: (err: string) => void,
    onIOfinished?: () => void) {

    let res = resolvers.get(filename);
    if (!res) {
        res = [];
        resolvers.set(filename, res);
    }

    let resolver: ReadResolver = {
        perf: new Core.Utils.PerformanceMonitor(),
        onParsed,
        onIOError,
        onUnexpectedError,
        onIOfinished
    };

    res.push(resolver);

    if (res.length > 1) {
        return;
    }

    resolver.perf.start('io');
    readString(filename, (err, data) => {        
        resolver.perf.end('io');
        resolve(filename, err, data);
    });
}