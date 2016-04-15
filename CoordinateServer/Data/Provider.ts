
import * as Core from 'LiteMol-core'
import * as Molecule from './Molecule'
import * as fs from 'fs'

import Cif = Core.Formats.Cif;

export enum MoleculeSource {
    File,
    Cache
}

export class MoleculeWrapper {
    constructor(public molecule: Molecule.Molecule, public source: MoleculeSource, public ioTime: number, public parseTime: number) {
    }
}

export function readMolecule(filename: string,
    onParsed: (err: string, m: MoleculeWrapper) => void,
    onIOError: (err: string) => void,
    onUnexpectedError: (err: string) => void,
    onIOfinished?: () => void) {

    let perf = new Core.Utils.PerformanceMonitor();
    perf.start('io');
    fs.readFile(filename, 'utf8', (err, data) => {
        perf.end('io');

        try {
            if (onIOfinished) onIOfinished();

            if (err) {
                onIOError('' + err);
                return;
            }

            perf.start('parse');
            let dict = Cif.parse(data);

            if (dict.error) {
                let error = dict.error.toString();
                onParsed(error, undefined);
                return;
            }

            if (!dict.result.dataBlocks.length) {
                let error = 'The input contains no data blocks.';
                onParsed(error, undefined);
                return;
            }

            let block = dict.result.dataBlocks[0];
            let rawMol = Cif.mmCif.ofDataBlock(block);
            perf.end('parse');

            let mol = new Molecule.Molecule(Molecule.Molecule.createKey(filename), block, rawMol);
            onParsed(undefined, new MoleculeWrapper(mol, MoleculeSource.File, perf.time('io'), perf.time('parse')));
        } catch (e) {
            onUnexpectedError('' + e);
        }

    });
}