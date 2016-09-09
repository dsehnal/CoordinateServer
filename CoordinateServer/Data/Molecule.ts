﻿import * as Core from 'LiteMol-core'

export class Model {
    constructor(public model: Core.Structure.MoleculeModel) {
    }
}

export class Molecule {

    static createKey(filename: string) {
        return filename.trim().toLowerCase();
    }

    models: Model[];
    
    approximateSize: number;

    constructor(public key: string, public cif: Core.Formats.CIF.Block, public molecule: Core.Structure.Molecule) {
        this.models = molecule.models.map(m => new Model(m));
        this.approximateSize = cif.data.length * 3;
    }
}