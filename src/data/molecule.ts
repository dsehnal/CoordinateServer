/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as Core from '../lib/LiteMol-core'

export class Model {
    constructor(public model: Core.Structure.Molecule.Model) {
    }
}

export class Molecule {

    static createKey(filename: string) {
        return filename.trim().toLowerCase();
    }

    models: Model[];
    
    approximateSize: number;

    constructor(public key: string, public cif: Core.Formats.CIF.DataBlock, public molecule: Core.Structure.Molecule, public dataSize: number) {
        this.models = molecule.models.map(m => new Model(m));
        this.approximateSize = dataSize * 3;
    }
}