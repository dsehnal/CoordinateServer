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
var Core = require('LiteMol-core');
var WriterContext = (function () {
    function WriterContext(fragment, model, data) {
        this.fragment = fragment;
        this.model = model;
        this.data = data;
    }
    Object.defineProperty(WriterContext.prototype, "isComplete", {
        get: function () {
            return this.model.source === Core.Structure.MoleculeModelSource.File
                ? this.fragment.atomCount === this.model.atoms.count
                : false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WriterContext.prototype, "residueNameSet", {
        get: function () {
            if (this._residueNameSet)
                return this._residueNameSet;
            var set = new Set();
            var name = this.model.residues.name;
            for (var _i = 0, _a = this.fragment.residueIndices; _i < _a.length; _i++) {
                var i = _a[_i];
                set.add(name[i]);
            }
            this._residueNameSet = set;
            return set;
        },
        enumerable: true,
        configurable: true
    });
    WriterContext.prototype.computeModres = function () {
        if (this._modres)
            return;
        var map = new Map();
        var names = new Set();
        this._modres = { map: map, names: names };
        var _mod_res = this.data.getCategory('_pdbx_struct_mod_residue');
        if (!_mod_res)
            return map;
        for (var i = 0; i < _mod_res.rowCount; i++) {
            var key = _mod_res.getStringValue('_pdbx_struct_mod_residue.label_asym_id', i) + " " + _mod_res.getStringValue('_pdbx_struct_mod_residue.label_seq_id', i) + " " + _mod_res.getStringValue('_pdbx_struct_mod_residue.PDB_ins_code', i);
            map.set(key, { i: i, original: _mod_res.getStringValue('_pdbx_struct_mod_residue.parent_comp_id', i) });
            names.add(_mod_res.getStringValue('_pdbx_struct_mod_residue.label_comp_id', i));
        }
    };
    Object.defineProperty(WriterContext.prototype, "modifiedResidues", {
        get: function () {
            this.computeModres();
            return this._modres;
        },
        enumerable: true,
        configurable: true
    });
    WriterContext.prototype.getSourceResidueStringId = function (i) {
        var res = this.model.residues, chains = this.model.chains, asymId;
        if (chains.sourceChainIndex) {
            var parent_1 = this.model.parent;
            if (parent_1) {
                asymId = parent_1.chains.asymId[chains.sourceChainIndex[res.chainIndex[i]]];
            }
            else {
                asymId = res.asymId[i];
            }
        }
        else {
            asymId = res.asymId[i];
        }
        return asymId + " " + res.seqNumber[i] + " " + res.insCode[i];
    };
    return WriterContext;
}());
exports.WriterContext = WriterContext;
function isMultiline(value) {
    return !!value && value.indexOf('\n') >= 0;
}
function writeCifSingleRecord(category, writer) {
    var fields = category.desc.fields;
    var data = category.data;
    var width = fields.reduce(function (w, s) { return Math.max(w, s.name.length); }, 0) + 5;
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var f = fields_1[_i];
        writer.writer.writePadRight(f.name, width);
        var val = f.string(data, 0);
        if (isMultiline(val)) {
            writer.writeMultiline(val);
            writer.writer.newline();
        }
        else {
            writer.writeChecked(val);
        }
        writer.writer.newline();
    }
    writer.write('#\n');
}
function writeCifLoop(category, writer) {
    writer.writeLine('loop_');
    var fields = category.desc.fields;
    var data = category.data;
    for (var _i = 0, fields_2 = fields; _i < fields_2.length; _i++) {
        var f = fields_2[_i];
        writer.writeLine(category.desc.name + "." + f.name);
    }
    var count = category.count;
    for (var i = 0; i < count; i++) {
        for (var _a = 0, fields_3 = fields; _a < fields_3.length; _a++) {
            var f = fields_3[_a];
            var val = f.string(data, i);
            if (isMultiline(val)) {
                writer.writeMultiline(val);
                writer.writer.newline();
            }
            else {
                writer.writeChecked(val);
            }
        }
        writer.newline();
    }
    writer.write('#\n');
}
function writeCifCategory(category, context, writer) {
    var data = category(context);
    if (data.count === 0)
        return;
    else if (data.count === 1) {
        writeCifSingleRecord(data, writer);
    }
    else {
        writeCifLoop(data, writer);
    }
}
exports.writeCifCategory = writeCifCategory;
