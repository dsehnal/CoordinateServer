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

import * as Core from 'LiteMol-core'
import CifStringWriter from './CifStringWriter'
import BCifDataWriter from './BCifDataWriter'

export interface FieldDesc<T> {
    name: string,
    string?: (ctx: T, i: number) => string,
    number?: (ctx: T, i: number) => number,
    typedArray?: any,
    encoder: (data: any) => Core.Formats.BinaryCIF.Encoder
}

export interface CategoryDesc<T> {
    name: string, 
    fields: FieldDesc<T>[]
}

export type CategoryInstance = { data: any, count: number, desc: CategoryDesc<any> }
export type CategoryProvider = (context: WriterContext) => CategoryInstance

export class WriterContext {
    get isComplete() {
        return this.model.source === Core.Structure.MoleculeModelSource.File
            ? this.fragment.atomCount === this.model.atoms.count
            : false;
    }

    private _residueNameSet: Set<string>;
    get residueNameSet() {
        if (this._residueNameSet) return this._residueNameSet;

        let set = new Set<string>();
        let name = this.model.residues.name;
        for (let i of this.fragment.residueIndices) {
            set.add(name[i]);
        }
        this._residueNameSet = set;
        return set;
    }

    private _modres: { map: Map<string, { i: number, original: string }>, names: Set<string> };

    private computeModres() {
        if (this._modres) return;


        let map = new Map<string, { i: number, original: string }>();
        let names = new Set<string>();
        this._modres = { map, names };

        let _mod_res = this.data.getCategory('_pdbx_struct_mod_residue');
        if (!_mod_res) return map;


        for (let i = 0; i < _mod_res.rowCount; i++) {
            let key = `${_mod_res.getStringValue('_pdbx_struct_mod_residue.label_asym_id', i)} ${_mod_res.getStringValue('_pdbx_struct_mod_residue.label_seq_id', i)} ${_mod_res.getStringValue('_pdbx_struct_mod_residue.PDB_ins_code', i)}`;
            map.set(key, { i, original: _mod_res.getStringValue('_pdbx_struct_mod_residue.parent_comp_id', i) });
            names.add(_mod_res.getStringValue('_pdbx_struct_mod_residue.label_comp_id', i));
        }
    }

    get modifiedResidues() {
        this.computeModres();
        return this._modres;
    }

    getSourceResidueStringId(i: number) {
        let res = this.model.residues, chains = this.model.chains, asymId: string;
        if (chains.sourceChainIndex) {
            let parent = this.model.parent;
            if (parent) {
                asymId = parent.chains.asymId[chains.sourceChainIndex[res.chainIndex[i]]];
            } else {
                asymId = res.asymId[i];
            }
        } else {
            asymId = res.asymId[i];
        }
        return `${asymId} ${res.seqNumber[i]} ${res.insCode[i]}`;
    }

    constructor(public fragment: Core.Structure.Query.Fragment, public model: Core.Structure.MoleculeModel, public data: Core.Formats.CIF.Block) {
    }
}

function isMultiline(value: string) {
    return !!value && value.indexOf('\n') >= 0;
}

function writeCifSingleRecord(category: CategoryInstance, writer: CifStringWriter) {
    let fields = category.desc.fields;
    let data = category.data;
    let width = fields.reduce((w, s) => Math.max(w, s.name.length), 0) + 5;

    for (let f of fields) {
        writer.writer.writePadRight(f.name, width);
        let val = f.string(data, 0);
        if (isMultiline(val)) {
            writer.writeMultiline(val);
            writer.writer.newline();
        } else {
            writer.writeChecked(val);
        }
        writer.writer.newline();
    }
    writer.write('#\n');
}

function writeCifLoop(category: CategoryInstance, writer: CifStringWriter) {
    writer.writeLine('loop_');
    let fields = category.desc.fields;
    let data = category.data;
    for (let f of fields) {
        writer.writeLine(`${category.desc.name}.${f.name}`);
    }
    let count = category.count;
    for (let i = 0; i < count; i++) {
        for (let f of fields) {
            let val = f.string(data, i);
            if (isMultiline(val)) {
                writer.writeMultiline(val);
                writer.writer.newline();
            } else {
                writer.writeChecked(val);
            }
        }
        writer.newline();
    }
    writer.write('#\n');
}

export function writeCifCategory<T>(category: CategoryProvider, context: WriterContext, writer: CifStringWriter) {
    let data = category(context);
    if (data.count === 0) return;
    else if (data.count === 1) {
        writeCifSingleRecord(data, writer);
    } else {
        writeCifLoop(data, writer);
    }
}
