"use strict";
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Core = require("../../lib/LiteMol-core");
var context_1 = require("../context");
var direct_category_mapper_1 = require("../direct-category-mapper");
var CIF = Core.Formats.CIF;
var mmCifContext;
(function (mmCifContext) {
    function isComplete(mmCtx) {
        return mmCtx.model.source === Core.Structure.Molecule.Model.Source.File
            ? mmCtx.fragment.atomCount === mmCtx.model.data.atoms.count
            : false;
    }
    mmCifContext.isComplete = isComplete;
    function residueNameSet(mmCtx) {
        if (mmCtx._residueNameSet)
            return mmCtx._residueNameSet;
        var set = Core.Utils.FastSet.create();
        var name = mmCtx.model.data.residues.name;
        for (var _i = 0, _a = mmCtx.fragment.residueIndices; _i < _a.length; _i++) {
            var i = _a[_i];
            set.add(name[i]);
        }
        mmCtx._residueNameSet = set;
        return set;
    }
    mmCifContext.residueNameSet = residueNameSet;
    function computeModres(mmCtx) {
        if (mmCtx._modres)
            return;
        var map = Core.Utils.FastMap.create();
        var names = Core.Utils.FastSet.create();
        mmCtx._modres = { map: map, names: names };
        var _mod_res = mmCtx.data.getCategory('_pdbx_struct_mod_residue');
        if (!_mod_res)
            return;
        var label_asym_id = _mod_res.getColumn('label_asym_id');
        var label_seq_id = _mod_res.getColumn('label_seq_id');
        var PDB_ins_code = _mod_res.getColumn('PDB_ins_code');
        var parent_comp_id = _mod_res.getColumn('parent_comp_id');
        var label_comp_id = _mod_res.getColumn('label_comp_id');
        for (var i = 0; i < _mod_res.rowCount; i++) {
            var key = label_asym_id.getString(i) + " " + label_seq_id.getString(i) + " " + PDB_ins_code.getString(i);
            map.set(key, { i: i, original: parent_comp_id.getString(i) });
            names.add(label_comp_id.getString(i));
        }
    }
    function modifiedResidues(mmCtx) {
        computeModres(mmCtx);
        return mmCtx._modres;
    }
    mmCifContext.modifiedResidues = modifiedResidues;
    function getSourceResidueStringId(mmCtx, i) {
        var res = mmCtx.model.data.residues, chains = mmCtx.model.data.chains, asymId;
        if (chains.sourceChainIndex) {
            var parent = mmCtx.model.parent;
            if (parent) {
                asymId = parent.data.chains.asymId[chains.sourceChainIndex[res.chainIndex[i]]];
            }
            else {
                asymId = res.asymId[i];
            }
        }
        else {
            asymId = res.asymId[i];
        }
        return asymId + " " + res.seqNumber[i] + " " + res.insCode[i];
    }
    mmCifContext.getSourceResidueStringId = getSourceResidueStringId;
    function create(fragment, model, data, lowPrecisionCoords) {
        return {
            fragment: fragment,
            model: model,
            data: data,
            lowPrecisionCoords: lowPrecisionCoords,
            _modres: void 0,
            _residueNameSet: void 0
        };
    }
    mmCifContext.create = create;
})(mmCifContext = exports.mmCifContext || (exports.mmCifContext = {}));
var SourceCategoryMap = (function () {
    function SourceCategoryMap(context, name, keyColumnName) {
        this.byKey = Core.Utils.FastMap.create();
        this.category = void 0;
        var cat = context.data.getCategory(name);
        if (!cat)
            return;
        var col = cat.getColumn(keyColumnName);
        if (!col.isDefined)
            return;
        this.category = cat;
        for (var i = 0; i < cat.rowCount; i++) {
            var id = col.getString(i);
            this.byKey.set(id, i);
        }
    }
    SourceCategoryMap.prototype.getString = function (id, columnName) {
        if (!this.category)
            return null;
        var row = this.byKey.get(id);
        if (row === void 0)
            return null;
        var col = this.category.getColumn(columnName);
        return col.getString(row);
    };
    SourceCategoryMap.prototype.getPresence = function (id, columnName) {
        if (!this.category)
            return 1 /* NotSpecified */;
        var row = this.byKey.get(id);
        if (row === void 0)
            return 1 /* NotSpecified */;
        var col = this.category.getColumn(columnName);
        return col.getValuePresence(row);
    };
    return SourceCategoryMap;
}());
function stringColumn(name, column, row) {
    return { name: name, string: function (data, i) { return column.getString(row(data, i)); }, presence: function (data, i) { return column.getValuePresence(row(data, i)); } };
}
exports.stringColumn = stringColumn;
function int32column(name, column, row, encoder) {
    return { name: name, string: function (data, i) { return column.getString(row(data, i)); }, number: function (data, i) { return column.getInteger(row(data, i)); }, presence: function (data, i) { return column.getValuePresence(row(data, i)); }, typedArray: Int32Array, encoder: encoder };
}
exports.int32column = int32column;
function float64field(name, value) {
    return { name: name, string: function (data, i) { return value(data, i).toString(); }, number: value, typedArray: Float64Array, encoder: context_1.Encoders.float64 };
}
exports.float64field = float64field;
function int32field(name, value) {
    return { name: name, string: function (data, i) { return value(data, i).toString(); }, number: value, typedArray: Int32Array, encoder: context_1.Encoders.int32 };
}
exports.int32field = int32field;
function _entry(context) {
    return {
        data: context.model.id,
        count: 1,
        desc: {
            name: '_entry',
            fields: [
                { name: 'id', string: function (id) { return id; }, encoder: context_1.Encoders.strings, presence: function () { return 0 /* Present */; } }
            ]
        }
    };
}
function _entity(context) {
    var f = context.fragment;
    if (!f.entityIndices.length)
        return void 0;
    var uniqueEntities = Core.Utils.FastSet.create();
    var entityIndices = [];
    for (var _i = 0, _a = f.entityIndices; _i < _a.length; _i++) {
        var i = _a[_i];
        var id = context.model.data.entities.entityId[i];
        if (!uniqueEntities.has(id)) {
            entityIndices.push(i);
            uniqueEntities.add(id);
        }
    }
    entityIndices.sort(function (i, j) { return i - j; });
    var e = context.model.data.entities;
    var map = new SourceCategoryMap(context, '_entity', 'id');
    var data = { id: e.entityId, type: e.type, index: entityIndices, map: map };
    var fields = [
        { name: 'id', string: function (data, i) { return data.id[data.index[i]]; } },
        { name: 'type', string: function (data, i) { return data.type[data.index[i]]; } },
        { name: 'src_method', string: function (data, i) { return data.map.getString(data.id[data.index[i]], 'src_method'); }, presence: function (data, i) { return data.map.getPresence(data.id[data.index[i]], 'src_method'); } },
        { name: 'pdbx_description', string: function (data, i) { return data.map.getString(data.id[data.index[i]], 'pdbx_description'); }, presence: function (data, i) { return data.map.getPresence(data.id[data.index[i]], 'pdbx_description'); } },
        { name: 'formula_weight', presence: function () { return 2 /* Unknown */; } },
        { name: 'pdbx_number_of_molecules', presence: function () { return 2 /* Unknown */; } },
        { name: 'details', presence: function () { return 1 /* NotSpecified */; } },
        { name: 'pdbx_mutation', string: function (data, i) { return data.map.getString(data.id[data.index[i]], 'pdbx_mutation'); }, presence: function (data, i) { return data.map.getPresence(data.id[data.index[i]], 'pdbx_mutation'); } },
        { name: 'pdbx_fragment', string: function (data, i) { return data.map.getString(data.id[data.index[i]], 'pdbx_fragment'); }, presence: function (data, i) { return data.map.getPresence(data.id[data.index[i]], 'pdbx_fragment'); } },
        { name: 'pdbx_ec', string: function (data, i) { return data.map.getString(data.id[data.index[i]], 'pdbx_ec'); }, presence: function (data, i) { return data.map.getPresence(data.id[data.index[i]], 'pdbx_ec'); } }
    ];
    return {
        data: data,
        count: entityIndices.length,
        desc: {
            name: '_entity',
            fields: fields
        }
    };
}
function _exptl(context) {
    var cat = context.data.getCategory('_exptl');
    if (!cat || !cat.rowCount)
        return;
    var rows = [];
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }
    var data = {
        rows: rows,
        entry_id: cat.getColumn('entry_id'),
        method: cat.getColumn('method')
    };
    var fields = [
        stringColumn('entry_id', data.entry_id, function (data, i) { return data.rows[i]; }),
        stringColumn('method', data.method, function (data, i) { return data.rows[i]; })
    ];
    return {
        data: data,
        count: rows.length,
        desc: {
            name: '_exptl',
            fields: fields
        }
    };
}
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
function findSecondary(test, context) {
    if (!context.model.data.secondaryStructure)
        return;
    var starts = [], ends = [], lengths = [], ssIndices = [];
    var struct = context.model.data.secondaryStructure.filter(function (s) { return test(s.type); });
    if (!struct.length)
        return;
    var currentStructure = 0, currentStart = struct[0].startResidueIndex, currentEnd = struct[0].endResidueIndex;
    var residues = context.fragment.residueIndices;
    for (var k = 0, length = residues.length; k < length;) {
        var residueIndex = residues[k];
        if (residueIndex >= currentStart && residueIndex < currentEnd) {
            var slen = 0;
            while (k < length && currentEnd > residues[k]) {
                k++;
                slen++;
            }
            k--;
            starts[starts.length] = residueIndex;
            ends[ends.length] = residues[k];
            lengths[lengths.length] = slen;
            ssIndices[ssIndices.length] = currentStructure;
            currentStructure++;
            if (currentStructure >= struct.length)
                break;
            currentStart = struct[currentStructure].startResidueIndex;
            currentEnd = struct[currentStructure].endResidueIndex;
        }
        else {
            while (residueIndex >= currentEnd) {
                currentStructure++;
                if (currentStructure >= struct.length)
                    break;
                currentStart = struct[currentStructure].startResidueIndex;
                currentEnd = struct[currentStructure].endResidueIndex;
            }
            if (currentStructure >= struct.length)
                break;
            if (residueIndex < currentStart)
                k++;
        }
    }
    return { starts: starts, ends: ends, lengths: lengths, ssIndices: ssIndices, struct: struct };
}
function _struct_conf(context) {
    var helix = 1 /* Helix */, turn = 2 /* Turn */;
    var ssIndices = findSecondary(function (t) { return t === helix || t === turn; }, context);
    if (!ssIndices || !ssIndices.starts.length)
        return;
    var rs = context.model.data.residues;
    var data = { indices: ssIndices, residues: rs, index: context.fragment.residueIndices, helixCounter: 0, turnCounter: 0, helix: helix, turn: turn };
    var fields = [
        { name: 'conf_type_id', string: function (data, i) { return data.indices.struct[data.indices.ssIndices[i]].type === data.helix ? 'HELX_P' : 'TURN_P'; } },
        { name: 'id', string: function (data, i) { return data.indices.struct[data.indices.ssIndices[i]].type === data.helix ? 'HELX_P' + (++data.helixCounter) : 'TURN_P' + (++data.turnCounter); } },
        { name: 'pdbx_PDB_helix_id', string: function (data, i) { return (i + 1).toString(); } },
        { name: 'beg_label_comp_id', string: function (data, i) { return data.residues.name[data.indices.starts[i]]; } },
        { name: 'beg_label_asym_id', string: function (data, i) { return data.residues.asymId[data.indices.starts[i]]; } },
        { name: 'beg_label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.indices.starts[i]].toString(); } },
        { name: 'pdbx_beg_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.indices.starts[i]]; }, presence: function (data, i) { return data.residues.insCode[data.indices.starts[i]] ? 0 /* Present */ : 1 /* NotSpecified */; } },
        { name: 'end_label_comp_id', string: function (data, i) { return data.residues.name[data.indices.ends[i]]; } },
        { name: 'end_label_asym_id', string: function (data, i) { return data.residues.asymId[data.indices.ends[i]]; } },
        { name: 'end_label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.indices.ends[i]].toString(); } },
        { name: 'pdbx_end_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.indices.ends[i]]; }, presence: function (data, i) { return data.residues.insCode[data.indices.ends[i]] ? 0 /* Present */ : 1 /* NotSpecified */; } },
        { name: 'beg_auth_comp_id', string: function (data, i) { return data.residues.authName[data.indices.starts[i]]; } },
        { name: 'beg_auth_asym_id', string: function (data, i) { return data.residues.authAsymId[data.indices.starts[i]]; } },
        { name: 'beg_auth_seq_id', string: function (data, i) { return data.residues.authSeqNumber[data.indices.starts[i]].toString(); } },
        { name: 'end_auth_comp_id', string: function (data, i) { return data.residues.authName[data.indices.ends[i]]; } },
        { name: 'end_auth_asym_id', string: function (data, i) { return data.residues.authAsymId[data.indices.ends[i]]; } },
        { name: 'end_auth_seq_id', string: function (data, i) { return data.residues.authSeqNumber[data.indices.ends[i]].toString(); } },
        { name: 'pdbx_PDB_helix_class', string: function (data, i) { var val = data.indices.struct[data.indices.ssIndices[i]].info.helixClass; return val !== null && val !== undefined ? '' + val : '?'; } },
        { name: 'details', presence: function () { return 2 /* Unknown */; } },
        { name: 'pdbx_PDB_helix_length', string: function (data, i) { return data.indices.lengths[i].toString(); } }
    ];
    return {
        data: data,
        count: ssIndices.starts.length,
        desc: {
            name: '_struct_conf',
            fields: fields
        }
    };
}
function _struct_sheet_range(context) {
    var sheet = 3 /* Sheet */;
    var ssIndices = findSecondary(function (t) { return t === sheet; }, context);
    if (!ssIndices || !ssIndices.starts.length)
        return;
    var rs = context.model.data.residues;
    var data = { indices: ssIndices, residues: rs, index: context.fragment.residueIndices };
    var fields = [
        { name: 'sheet_id', string: function (data, i) { var val = data.indices.struct[data.indices.ssIndices[i]].info.sheetId; return val !== null && val !== undefined ? '' + val : (i + 1).toString(); } },
        { name: 'id', string: function (data, i) { var val = data.indices.struct[data.indices.ssIndices[i]].info.id; return val !== null && val !== undefined ? '' + val : (i + 1).toString(); } },
        { name: 'beg_label_comp_id', string: function (data, i) { return data.residues.name[data.indices.starts[i]]; } },
        { name: 'beg_label_asym_id', string: function (data, i) { return data.residues.asymId[data.indices.starts[i]]; } },
        { name: 'beg_label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.indices.starts[i]].toString(); } },
        { name: 'pdbx_beg_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.indices.starts[i]]; }, presence: function (data, i) { return data.residues.insCode[data.indices.starts[i]] ? 0 /* Present */ : 1 /* NotSpecified */; } },
        { name: 'end_label_comp_id', string: function (data, i) { return data.residues.name[data.indices.ends[i]]; } },
        { name: 'end_label_asym_id', string: function (data, i) { return data.residues.asymId[data.indices.ends[i]]; } },
        { name: 'end_label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.indices.ends[i]].toString(); } },
        { name: 'pdbx_end_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.indices.ends[i]]; }, presence: function (data, i) { return data.residues.insCode[data.indices.ends[i]] ? 0 /* Present */ : 1 /* NotSpecified */; } },
        { name: 'symmetry', string: function (data, i) { return '' + data.indices.struct[data.indices.ssIndices[i]].info.symmetry; }, presence: function (data, i) { return data.indices.struct[data.indices.ssIndices[i]].info.symmetry ? 0 /* Present */ : 2 /* Unknown */; } },
        { name: 'beg_auth_comp_id', string: function (data, i) { return data.residues.authName[data.indices.starts[i]]; } },
        { name: 'beg_auth_asym_id', string: function (data, i) { return data.residues.authAsymId[data.indices.starts[i]]; } },
        { name: 'beg_auth_seq_id', string: function (data, i) { return data.residues.authSeqNumber[data.indices.starts[i]].toString(); } },
        { name: 'end_auth_comp_id', string: function (data, i) { return data.residues.authName[data.indices.ends[i]]; } },
        { name: 'end_auth_asym_id', string: function (data, i) { return data.residues.authAsymId[data.indices.ends[i]]; } },
        { name: 'end_auth_seq_id', string: function (data, i) { return data.residues.authSeqNumber[data.indices.ends[i]].toString(); } },
    ];
    return {
        data: data,
        count: ssIndices.starts.length,
        desc: {
            name: '_struct_sheet_range',
            fields: fields
        }
    };
}
function _struct_conn(context) {
    var cat = context.data.getCategory('_struct_conn');
    if (!cat)
        return;
    return direct_category_mapper_1.categoryMapper(cat, [
        { name: 'id', type: 'String' },
        { name: 'conn_type_id', type: 'String' },
        { name: 'pdbx_PDB_id', type: 'String' },
        { name: 'ptnr1_label_asym_id', type: 'String' },
        { name: 'ptnr1_label_comp_id', type: 'String' },
        { name: 'ptnr1_label_seq_id', type: 'Int' },
        { name: 'ptnr1_label_atom_id', type: 'String' },
        { name: 'pdbx_ptnr1_label_alt_id', type: 'String' },
        { name: 'pdbx_ptnr1_PDB_ins_code', type: 'String' },
        { name: 'pdbx_ptnr1_standard_comp_id', type: 'String' },
        { name: 'ptnr1_symmetry', type: 'String' },
        { name: 'ptnr2_label_asym_id', type: 'String' },
        { name: 'ptnr2_label_comp_id', type: 'String' },
        { name: 'ptnr2_label_seq_id', type: 'Int' },
        { name: 'ptnr2_label_atom_id', type: 'String' },
        { name: 'pdbx_ptnr2_label_alt_id', type: 'String' },
        { name: 'pdbx_ptnr2_PDB_ins_code', type: 'String' },
        { name: 'ptnr1_auth_asym_id', type: 'String' },
        { name: 'ptnr1_auth_comp_id', type: 'String' },
        { name: 'ptnr1_auth_seq_id', type: 'Int' },
        { name: 'ptnr2_auth_asym_id', type: 'String' },
        { name: 'ptnr2_auth_comp_id', type: 'String' },
        { name: 'ptnr2_auth_seq_id', type: 'Int' },
        { name: 'ptnr2_symmetry', type: 'String' },
        { name: 'pdbx_ptnr3_label_asym_id', type: 'String' },
        { name: 'pdbx_ptnr3_label_comp_id', type: 'String' },
        { name: 'pdbx_ptnr3_label_seq_id', type: 'Int' },
        { name: 'pdbx_ptnr3_label_alt_id', type: 'String' },
        { name: 'pdbx_ptnr3_label_atom_id', type: 'String' },
        { name: 'pdbx_ptnr3_PDB_ins_code', type: 'String' },
        { name: 'details', type: 'String' },
        { name: 'pdbx_dist_value', type: 'Float32' },
        { name: 'pdbx_value_order', type: 'String' }
    ]);
}
function _struct_conn_type(context) {
    var cat = context.data.getCategory('_struct_conn_type');
    if (!cat)
        return;
    return direct_category_mapper_1.categoryMapper(cat, [
        { name: 'id', type: 'String' },
        { name: 'criteria', type: 'String' },
        { name: 'reference', type: 'String' },
    ]);
}
function _chem_comp_bond(context) {
    var cat = context.data.getCategory('_chem_comp_bond');
    if (!cat)
        return;
    var nameCol = cat.getColumn('comp_id');
    if (!nameCol)
        return;
    var rows = [];
    var names = mmCifContext.residueNameSet(context);
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        var n = nameCol.getString(i);
        if (names.has(n))
            rows[rows.length] = i;
    }
    if (!rows.length)
        return;
    var data = {
        rows: rows,
        comp_id: cat.getColumn('comp_id'),
        pdbx_stereo_config: cat.getColumn('pdbx_stereo_config'),
        pdbx_ordinal: cat.getColumn('pdbx_ordinal'),
        pdbx_aromatic_flag: cat.getColumn('pdbx_aromatic_flag'),
        atom_id_1: cat.getColumn('atom_id_1'),
        atom_id_2: cat.getColumn('atom_id_2'),
        value_order: cat.getColumn('value_order')
    };
    var fields = [
        stringColumn('comp_id', data.comp_id, function (data, i) { return data.rows[i]; }),
        stringColumn('pdbx_stereo_config', data.pdbx_stereo_config, function (data, i) { return data.rows[i]; }),
        int32column('pdbx_ordinal', data.pdbx_ordinal, function (data, i) { return data.rows[i]; }, context_1.Encoders.ids),
        stringColumn('pdbx_aromatic_flag', data.pdbx_aromatic_flag, function (data, i) { return data.rows[i]; }),
        stringColumn('atom_id_1', data.atom_id_1, function (data, i) { return data.rows[i]; }),
        stringColumn('atom_id_2', data.atom_id_2, function (data, i) { return data.rows[i]; }),
        stringColumn('value_order', data.value_order, function (data, i) { return data.rows[i]; })
    ];
    return {
        data: data,
        count: rows.length,
        desc: {
            name: '_chem_comp_bond',
            fields: fields
        }
    };
}
function _cell(context) {
    var cat = context.data.getCategory('_cell');
    if (!cat || !cat.rowCount)
        return;
    var rows = [];
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }
    var data = {
        rows: rows,
        entry_id: cat.getColumn('entry_id'),
        length_a: cat.getColumn('length_a'),
        length_b: cat.getColumn('length_b'),
        length_c: cat.getColumn('length_c'),
        angle_alpha: cat.getColumn('angle_alpha'),
        angle_beta: cat.getColumn('angle_beta'),
        angle_gamma: cat.getColumn('angle_gamma'),
        Z_PDB: cat.getColumn('Z_PDB'),
        pdbx_unique_axis: cat.getColumn('pdbx_unique_axis')
    };
    var fields = [
        stringColumn('entry_id', data.entry_id, function (data, i) { return data.rows[i]; }),
        float64field('length_a', function (data, i) { return data.length_a.getFloat(data.rows[i]); }),
        float64field('length_b', function (data, i) { return data.length_b.getFloat(data.rows[i]); }),
        float64field('length_c', function (data, i) { return data.length_c.getFloat(data.rows[i]); }),
        float64field('angle_alpha', function (data, i) { return data.angle_alpha.getFloat(data.rows[i]); }),
        float64field('angle_beta', function (data, i) { return data.angle_beta.getFloat(data.rows[i]); }),
        float64field('angle_gamma', function (data, i) { return data.angle_gamma.getFloat(data.rows[i]); }),
        int32field('Z_PDB', function (data, i) { return data.Z_PDB.getFloat(data.rows[i]); }),
        stringColumn('pdbx_unique_axis', data.pdbx_unique_axis, function (data, i) { return data.rows[i]; })
    ];
    return {
        data: data,
        count: rows.length,
        desc: {
            name: '_cell',
            fields: fields
        }
    };
}
function _symmetry(context) {
    var cat = context.data.getCategory('_symmetry');
    if (!cat || !cat.rowCount)
        return;
    var rows = [];
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }
    var data = {
        rows: rows,
        entry_id: cat.getColumn('entry_id'),
        space_group_name_HM: cat.getColumn('space_group_name_H-M'),
        pdbx_full_space_group_name_HM: cat.getColumn('pdbx_full_space_group_name_H-M'),
        cell_setting: cat.getColumn('cell_setting'),
        Int_Tables_number: cat.getColumn('Int_Tables_number'),
        space_group_name_Hall: cat.getColumn('space_group_name_Hall')
    };
    var fields = [
        stringColumn('entry_id', data.entry_id, function (data, i) { return data.rows[i]; }),
        stringColumn('space_group_name_H-M', data.space_group_name_HM, function (data, i) { return data.rows[i]; }),
        stringColumn('pdbx_full_space_group_name_H-M', data.pdbx_full_space_group_name_HM, function (data, i) { return data.rows[i]; }),
        stringColumn('cell_setting', data.cell_setting, function (data, i) { return data.rows[i]; }),
        stringColumn('Int_Tables_number', data.Int_Tables_number, function (data, i) { return data.rows[i]; }),
        stringColumn('space_group_name_Hall', data.space_group_name_Hall, function (data, i) { return data.rows[i]; })
    ];
    return {
        data: data,
        count: rows.length,
        desc: {
            name: '_symmetry',
            fields: fields
        }
    };
}
function _pdbx_struct_assembly(context) {
    var cat = context.data.getCategory('_pdbx_struct_assembly');
    if (!cat || !cat.rowCount)
        return;
    var rows = [];
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }
    var data = {
        rows: rows,
        id: cat.getColumn('id'),
        details: cat.getColumn('details'),
        method_details: cat.getColumn('method_details'),
        oligomeric_details: cat.getColumn('oligomeric_details'),
        oligomeric_count: cat.getColumn('oligomeric_count')
    };
    var fields = [
        stringColumn('id', data.id, function (data, i) { return data.rows[i]; }),
        stringColumn('details', data.details, function (data, i) { return data.rows[i]; }),
        stringColumn('method_details', data.method_details, function (data, i) { return data.rows[i]; }),
        stringColumn('oligomeric_details', data.oligomeric_details, function (data, i) { return data.rows[i]; }),
        int32field('oligomeric_count', function (data, i) { return data.oligomeric_count.getInteger(data.rows[i]); })
    ];
    return {
        data: data,
        count: rows.length,
        desc: {
            name: '_pdbx_struct_assembly',
            fields: fields
        }
    };
}
function _pdbx_struct_assembly_gen(context) {
    var cat = context.data.getCategory('_pdbx_struct_assembly_gen');
    if (!cat || !cat.rowCount)
        return;
    var rows = [];
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }
    var data = {
        rows: rows,
        assembly_id: cat.getColumn('assembly_id'),
        oper_expression: cat.getColumn('oper_expression'),
        asym_id_list: cat.getColumn('asym_id_list')
    };
    var fields = [
        stringColumn('assembly_id', data.assembly_id, function (data, i) { return data.rows[i]; }),
        stringColumn('oper_expression', data.oper_expression, function (data, i) { return data.rows[i]; }),
        stringColumn('asym_id_list', data.asym_id_list, function (data, i) { return data.rows[i]; })
    ];
    return {
        data: data,
        count: rows.length,
        desc: {
            name: '_pdbx_struct_assembly_gen',
            fields: fields
        }
    };
}
function _pdbx_struct_oper_list(context) {
    var cat = context.data.getCategory('_pdbx_struct_oper_list');
    if (!cat || !cat.rowCount)
        return;
    var rows = [];
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }
    var data = {
        rows: rows,
        id: cat.getColumn('id'),
        type: cat.getColumn('type'),
        name: cat.getColumn('name'),
        symmetry_operation: cat.getColumn('symmetry_operation'),
        matrix11: cat.getColumn('matrix[1][1]'),
        matrix12: cat.getColumn('matrix[1][2]'),
        matrix13: cat.getColumn('matrix[1][3]'),
        vector1: cat.getColumn('vector[1]'),
        matrix21: cat.getColumn('matrix[2][1]'),
        matrix22: cat.getColumn('matrix[2][2]'),
        matrix23: cat.getColumn('matrix[2][3]'),
        vector2: cat.getColumn('vector[2]'),
        matrix31: cat.getColumn('matrix[3][1]'),
        matrix32: cat.getColumn('matrix[3][2]'),
        matrix33: cat.getColumn('matrix[3][3]'),
        vector3: cat.getColumn('vector[3]')
    };
    var fields = [
        stringColumn('id', data.id, function (data, i) { return data.rows[i]; }),
        stringColumn('type', data.type, function (data, i) { return data.rows[i]; }),
        stringColumn('name', data.name, function (data, i) { return data.rows[i]; }),
        stringColumn('symmetry_operation', data.symmetry_operation, function (data, i) { return data.rows[i]; }),
        float64field('matrix[1][1]', function (data, i) { return data.matrix11.getFloat(data.rows[i]); }),
        float64field('matrix[1][2]', function (data, i) { return data.matrix12.getFloat(data.rows[i]); }),
        float64field('matrix[1][3]', function (data, i) { return data.matrix13.getFloat(data.rows[i]); }),
        float64field('vector[1]', function (data, i) { return data.vector1.getFloat(data.rows[i]); }),
        float64field('matrix[2][1]', function (data, i) { return data.matrix21.getFloat(data.rows[i]); }),
        float64field('matrix[2][2]', function (data, i) { return data.matrix22.getFloat(data.rows[i]); }),
        float64field('matrix[2][3]', function (data, i) { return data.matrix23.getFloat(data.rows[i]); }),
        float64field('vector[2]', function (data, i) { return data.vector2.getFloat(data.rows[i]); }),
        float64field('matrix[3][1]', function (data, i) { return data.matrix31.getFloat(data.rows[i]); }),
        float64field('matrix[3][2]', function (data, i) { return data.matrix32.getFloat(data.rows[i]); }),
        float64field('matrix[3][3]', function (data, i) { return data.matrix33.getFloat(data.rows[i]); }),
        float64field('vector[3]', function (data, i) { return data.vector3.getFloat(data.rows[i]); })
    ];
    return {
        data: data,
        count: rows.length,
        desc: {
            name: '_pdbx_struct_oper_list',
            fields: fields
        }
    };
}
function _struct_asym(context) {
    var data = { index: context.fragment.chainIndices, chains: context.model.data.chains, parent: context.model.parent };
    var fields = [
        { name: 'id', string: function (data, i) { return data.chains.asymId[data.index[i]]; } },
        { name: 'pdbx_blank_PDB_chainid_flag', string: function (data, i) { return !data.chains.asymId[data.index[i]] ? 'Y' : 'N'; } },
        { name: 'pdbx_modified', string: function (data, i) { return 'Y'; } },
        { name: 'entity_id', string: function (data, i) { return data.chains.entityId[data.index[i]]; } },
        {
            name: 'details', string: function (data, i) {
                var idx = data.index[i];
                if (data.chains.sourceChainIndex && data.parent) {
                    if (data.parent.data.chains.asymId[data.chains.sourceChainIndex[idx]] !== data.chains.asymId[idx]) {
                        return 'Added by the Coordinate Server';
                    }
                }
                return 'Might not contain all original atoms depending on the query used';
            }
        },
    ];
    return {
        data: data,
        count: data.index.length,
        desc: {
            name: '_struct_asym',
            fields: fields
        }
    };
}
function _entity_poly(context) {
    var cat = context.data.getCategory('_entity_poly');
    if (!cat)
        return;
    var entityMap = Core.Utils.FastMap.create();
    var poly = [];
    var _entity = {
        entity_id: cat.getColumn('entity_id'),
        type: cat.getColumn('type'),
        nstd_linkage: cat.getColumn('nstd_linkage'),
        nstd_monomer: cat.getColumn('nstd_monomer'),
        pdbx_seq_one_letter_code: cat.getColumn('pdbx_seq_one_letter_code'),
        pdbx_seq_one_letter_code_can: cat.getColumn('pdbx_seq_one_letter_code_can')
    };
    for (var i = 0; i < cat.rowCount; i++) {
        var eId = _entity.entity_id.getString(i);
        var e = {
            entity_id: eId,
            type: _entity.type.getString(i),
            nstd_linkage: _entity.nstd_linkage.getString(i),
            nstd_monomer: _entity.nstd_monomer.getString(i),
            pdbx_seq_one_letter_code: _entity.pdbx_seq_one_letter_code.getString(i),
            pdbx_seq_one_letter_code_can: _entity.pdbx_seq_one_letter_code_can.getString(i),
            pdbx_strand_id: '',
            strand_set: Core.Utils.FastSet.create()
        };
        entityMap.set(eId, e);
        poly.push(e);
    }
    var chains = context.model.data.chains;
    for (var _i = 0, _a = context.fragment.chainIndices; _i < _a.length; _i++) {
        var chain = _a[_i];
        var asymId = chains.authAsymId[chain];
        var eId = chains.entityId[chain];
        var e = entityMap.get(eId);
        if (!e || e.strand_set.has(asymId))
            continue;
        if (!e.pdbx_strand_id.length)
            e.pdbx_strand_id = asymId;
        else
            e.pdbx_strand_id += ',' + asymId;
        e.strand_set.add(asymId);
    }
    poly = poly.filter(function (e) { return e.pdbx_strand_id.length > 0; });
    var data = poly;
    var fields = [
        { name: 'entity_id', string: function (data, i) { return data[i].entity_id; } },
        { name: 'type', string: function (data, i) { return data[i].type; }, presence: function (data, i) { return data[i].type ? 0 /* Present */ : 2 /* Unknown */; } },
        { name: 'nstd_linkage', string: function (data, i) { return data[i].nstd_linkage; }, presence: function (data, i) { return data[i].nstd_linkage ? 0 /* Present */ : 2 /* Unknown */; } },
        { name: 'nstd_monomer', string: function (data, i) { return data[i].nstd_monomer; }, presence: function (data, i) { return data[i].nstd_monomer ? 0 /* Present */ : 2 /* Unknown */; } },
        { name: 'pdbx_seq_one_letter_code', string: function (data, i) { return data[i].pdbx_seq_one_letter_code; }, presence: function (data, i) { return data[i].pdbx_seq_one_letter_code ? 0 /* Present */ : 2 /* Unknown */; } },
        { name: 'pdbx_seq_one_letter_code_can', string: function (data, i) { return data[i].pdbx_seq_one_letter_code_can; }, presence: function (data, i) { return data[i].pdbx_seq_one_letter_code_can ? 0 /* Present */ : 2 /* Unknown */; } },
        { name: 'pdbx_strand_id', string: function (data, i) { return data[i].pdbx_strand_id; }, presence: function (data, i) { return data[i].pdbx_strand_id ? 0 /* Present */ : 2 /* Unknown */; } }
    ];
    return {
        data: data,
        count: poly.length,
        desc: {
            name: '_entity_poly',
            fields: fields
        }
    };
}
function _pdbx_struct_mod_residue(context) {
    var cat = context.data.getCategory('_pdbx_struct_mod_residue');
    if (!cat)
        return;
    var modResIndices = [], residues = [];
    var info = mmCifContext.modifiedResidues(context);
    if (!info.map.size)
        return;
    var names = context.model.data.residues.name;
    for (var _i = 0, _a = context.fragment.residueIndices; _i < _a.length; _i++) {
        var res = _a[_i];
        if (!info.names.has(names[res]))
            continue;
        var e = info.map.get(mmCifContext.getSourceResidueStringId(context, res));
        if (e) {
            modResIndices[modResIndices.length] = e.i;
            residues[residues.length] = res;
        }
    }
    var data = {
        modResIndices: modResIndices,
        residues: residues,
        parent_comp_id: cat.getColumn('parent_comp_id'),
        details: cat.getColumn('details'),
        resTable: context.model.data.residues
    };
    var fields = [
        { name: 'id', string: function (data, i) { return (i + 1).toString(); } },
        { name: 'label_asym_id', string: function (data, i) { return data.resTable.asymId[data.residues[i]]; } },
        { name: 'label_seq_id', string: function (data, i) { return data.resTable.seqNumber[data.residues[i]].toString(); }, number: function (data, i) { return data.resTable.seqNumber[data.residues[i]]; }, typedArray: Int32Array, encoder: context_1.Encoders.ids },
        { name: 'label_comp_id', string: function (data, i) { return data.resTable.name[data.residues[i]]; } },
        { name: 'auth_asym_id', string: function (data, i) { return data.resTable.authAsymId[data.residues[i]]; } },
        { name: 'auth_seq_id', string: function (data, i) { return data.resTable.authSeqNumber[data.residues[i]].toString(); }, number: function (data, i) { return data.resTable.authSeqNumber[data.residues[i]]; }, typedArray: Int32Array, encoder: context_1.Encoders.ids },
        { name: 'auth_comp_id', string: function (data, i) { return data.resTable.authName[data.residues[i]]; } },
        { name: 'PDB_ins_code', string: function (data, i) { return data.resTable.insCode[data.residues[i]]; }, presence: function (data, i) { return data.resTable.insCode[data.residues[i]] ? 0 /* Present */ : 1 /* NotSpecified */; } },
        { name: 'parent_comp_id', string: function (data, i) { return data.parent_comp_id.getString(data.modResIndices[i]); }, presence: function (data, i) { return data.parent_comp_id.getValuePresence(data.modResIndices[i]); } },
        { name: 'details', string: function (data, i) { return data.details.getString(data.modResIndices[i]); }, presence: function (data, i) { return data.details.getValuePresence(data.modResIndices[i]); } }
    ];
    return {
        data: data,
        count: modResIndices.length,
        desc: {
            name: '_pdbx_struct_mod_residue',
            fields: fields
        }
    };
}
function _atom_sites(context) {
    var cat = context.data.getCategory('_atom_sites');
    if (!cat || !cat.rowCount)
        return;
    var rows = [];
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }
    var data = {
        rows: rows,
        entry_id: cat.getColumn('entry_id'),
        matrix11: cat.getColumn('fract_transf_matrix[1][1]'),
        matrix12: cat.getColumn('fract_transf_matrix[1][2]'),
        matrix13: cat.getColumn('fract_transf_matrix[1][3]'),
        vector1: cat.getColumn('fract_transf_vector[1]'),
        matrix21: cat.getColumn('fract_transf_matrix[2][1]'),
        matrix22: cat.getColumn('fract_transf_matrix[2][2]'),
        matrix23: cat.getColumn('fract_transf_matrix[2][3]'),
        vector2: cat.getColumn('fract_transf_vector[2]'),
        matrix31: cat.getColumn('fract_transf_matrix[3][1]'),
        matrix32: cat.getColumn('fract_transf_matrix[3][2]'),
        matrix33: cat.getColumn('fract_transf_matrix[3][3]'),
        vector3: cat.getColumn('fract_transf_vector[3]')
    };
    var fields = [
        stringColumn('entry_id', data.entry_id, function (data, i) { return data.rows[i]; }),
        float64field('fract_transf_matrix[1][1]', function (data, i) { return data.matrix11.getFloat(data.rows[i]); }),
        float64field('fract_transf_matrix[1][2]', function (data, i) { return data.matrix12.getFloat(data.rows[i]); }),
        float64field('fract_transf_matrix[1][3]', function (data, i) { return data.matrix13.getFloat(data.rows[i]); }),
        float64field('fract_transf_vector[1]', function (data, i) { return data.vector1.getFloat(data.rows[i]); }),
        float64field('fract_transf_matrix[2][1]', function (data, i) { return data.matrix21.getFloat(data.rows[i]); }),
        float64field('fract_transf_matrix[2][2]', function (data, i) { return data.matrix22.getFloat(data.rows[i]); }),
        float64field('fract_transf_matrix[2][3]', function (data, i) { return data.matrix23.getFloat(data.rows[i]); }),
        float64field('fract_transf_vector[2]', function (data, i) { return data.vector2.getFloat(data.rows[i]); }),
        float64field('fract_transf_matrix[3][1]', function (data, i) { return data.matrix31.getFloat(data.rows[i]); }),
        float64field('fract_transf_matrix[3][2]', function (data, i) { return data.matrix32.getFloat(data.rows[i]); }),
        float64field('fract_transf_matrix[3][3]', function (data, i) { return data.matrix33.getFloat(data.rows[i]); }),
        float64field('fract_transf_vector[3]', function (data, i) { return data.vector3.getFloat(data.rows[i]); })
    ];
    return {
        data: data,
        count: rows.length,
        desc: {
            name: '_atom_sites',
            fields: fields
        }
    };
}
function _atom_site(context) {
    //_atom_site.Cartn_x_esd
    //_atom_site.Cartn_y_esd
    //_atom_site.Cartn_z_esd
    //_atom_site.occupancy_esd
    //_atom_site.B_iso_or_equiv_esd
    //--_atom_site.pdbe_label_seq_id 
    var cat = context.data.getCategory('_atom_site');
    var data = {
        atomIndex: context.fragment.atomIndices,
        positions: context.model.positions,
        atoms: context.model.data.atoms,
        residues: context.model.data.residues,
        chains: context.model.data.chains,
        entities: context.model.data.entities,
        modelId: context.model.modelId,
        label_seq_id: cat.getColumn('label_seq_id'),
        Cartn_x_esd: cat.getColumn('Cartn_x_esd'),
        Cartn_y_esd: cat.getColumn('Cartn_y_esd'),
        Cartn_z_esd: cat.getColumn('Cartn_z_esd'),
        occupancy_esd: cat.getColumn('occupancy_esd'),
        B_iso_or_equiv_esd: cat.getColumn('B_iso_or_equiv_esd'),
        pdbx_formal_charge: cat.getColumn('pdbx_formal_charge'),
        coordRoundFactor: context.lowPrecisionCoords ? 10 : 1000,
        bRoundFactor: context.lowPrecisionCoords ? 10 : 100,
    };
    var coordinateEncoder = context.lowPrecisionCoords ? context_1.Encoders.coordinates1 : context_1.Encoders.coordinates3;
    var fields = [
        { name: 'group_PDB', string: function (data, i) { return data.residues.isHet[data.atoms.residueIndex[data.atomIndex[i]]] ? 'HETATM' : 'ATOM'; } },
        { name: 'id', string: function (data, i) { return data.atoms.id[data.atomIndex[i]].toString(); }, number: function (data, i) { return data.atoms.id[data.atomIndex[i]]; }, typedArray: Int32Array, encoder: context_1.Encoders.ids },
        { name: 'type_symbol', string: function (data, i) { return data.atoms.elementSymbol[data.atomIndex[i]]; } },
        { name: 'label_atom_id', string: function (data, i) { return data.atoms.name[data.atomIndex[i]]; } },
        { name: 'label_alt_id', string: function (data, i) { return data.atoms.altLoc[data.atomIndex[i]]; }, presence: function (data, i) { return data.atoms.altLoc[data.atomIndex[i]] ? 0 /* Present */ : 1 /* NotSpecified */; } },
        { name: 'label_comp_id', string: function (data, i) { return data.residues.name[data.atoms.residueIndex[data.atomIndex[i]]]; } },
        { name: 'label_asym_id', string: function (data, i) { return data.chains.asymId[data.atoms.chainIndex[data.atomIndex[i]]]; } },
        { name: 'label_entity_id', string: function (data, i) { return data.entities.entityId[data.atoms.entityIndex[data.atomIndex[i]]]; } },
        { name: 'label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.atoms.residueIndex[data.atomIndex[i]]].toString(); }, number: function (data, i) { return data.residues.seqNumber[data.atoms.residueIndex[data.atomIndex[i]]]; }, typedArray: Int32Array, encoder: context_1.Encoders.ids, presence: function (data, i) { return data.label_seq_id.getValuePresence(data.atoms.rowIndex[data.atomIndex[i]]); } },
        { name: 'pdbx_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.atoms.residueIndex[data.atomIndex[i]]]; }, presence: function (data, i) { return data.residues.insCode[data.atoms.residueIndex[data.atomIndex[i]]] ? 0 /* Present */ : 1 /* NotSpecified */; } },
        { name: 'Cartn_x', string: function (data, i) { return '' + Math.round(data.coordRoundFactor * data.positions.x[data.atomIndex[i]]) / data.coordRoundFactor; }, number: function (data, i) { return data.positions.x[data.atomIndex[i]]; }, typedArray: Float32Array, encoder: coordinateEncoder },
        { name: 'Cartn_y', string: function (data, i) { return '' + Math.round(data.coordRoundFactor * data.positions.y[data.atomIndex[i]]) / data.coordRoundFactor; }, number: function (data, i) { return data.positions.y[data.atomIndex[i]]; }, typedArray: Float32Array, encoder: coordinateEncoder },
        { name: 'Cartn_z', string: function (data, i) { return '' + Math.round(data.coordRoundFactor * data.positions.z[data.atomIndex[i]]) / data.coordRoundFactor; }, number: function (data, i) { return data.positions.z[data.atomIndex[i]]; }, typedArray: Float32Array, encoder: coordinateEncoder },
        { name: 'occupancy', string: function (data, i) { return '' + Math.round(100 * data.atoms.occupancy[data.atomIndex[i]]) / 100; }, number: function (data, i) { return data.atoms.occupancy[data.atomIndex[i]]; }, typedArray: Float32Array, encoder: context_1.Encoders.occupancy },
        { name: 'B_iso_or_equiv', string: function (data, i) { return '' + Math.round(data.bRoundFactor * data.atoms.tempFactor[data.atomIndex[i]]) / data.bRoundFactor; }, number: function (data, i) { return data.atoms.tempFactor[data.atomIndex[i]]; }, typedArray: Float32Array, encoder: coordinateEncoder },
        { name: 'pdbx_formal_charge', string: function (data, i) { return data.pdbx_formal_charge.getString(data.atoms.rowIndex[data.atomIndex[i]]); }, presence: function (data, i) { return data.pdbx_formal_charge.getValuePresence(data.atoms.rowIndex[data.atomIndex[i]]); } },
        { name: 'auth_atom_id', string: function (data, i) { return data.atoms.authName[data.atomIndex[i]]; } },
        { name: 'auth_comp_id', string: function (data, i) { return data.residues.authName[data.atoms.residueIndex[data.atomIndex[i]]]; } },
        { name: 'auth_asym_id', string: function (data, i) { return data.chains.authAsymId[data.atoms.chainIndex[data.atomIndex[i]]]; } },
        { name: 'auth_seq_id', string: function (data, i) { return data.residues.authSeqNumber[data.atoms.residueIndex[data.atomIndex[i]]].toString(); }, number: function (data, i) { return data.residues.authSeqNumber[data.atoms.residueIndex[data.atomIndex[i]]]; }, typedArray: Int32Array, encoder: context_1.Encoders.ids },
    ];
    if (data.Cartn_x_esd && data.Cartn_x_esd.getValuePresence(0) === 0 /* Present */) {
        fields.push({ name: 'Cartn_x_esd', string: function (data, i) { return data.Cartn_x_esd.getString(data.atoms.rowIndex[data.atomIndex[i]]); }, number: function (data, i) { return data.Cartn_x_esd.getFloat(data.atoms.rowIndex[data.atomIndex[i]]); }, typedArray: Float32Array, encoder: coordinateEncoder }, { name: 'Cartn_y_esd', string: function (data, i) { return data.Cartn_y_esd.getString(data.atoms.rowIndex[data.atomIndex[i]]); }, number: function (data, i) { return data.Cartn_y_esd.getFloat(data.atoms.rowIndex[data.atomIndex[i]]); }, typedArray: Float32Array, encoder: coordinateEncoder }, { name: 'Cartn_z_esd', string: function (data, i) { return data.Cartn_z_esd.getString(data.atoms.rowIndex[data.atomIndex[i]]); }, number: function (data, i) { return data.Cartn_z_esd.getFloat(data.atoms.rowIndex[data.atomIndex[i]]); }, typedArray: Float32Array, encoder: coordinateEncoder });
    }
    if (data.occupancy_esd && data.occupancy_esd.getValuePresence(0) === 0 /* Present */) {
        fields.push({ name: 'occupancy_esd', string: function (data, i) { return data.occupancy_esd.getString(data.atoms.rowIndex[data.atomIndex[i]]); }, number: function (data, i) { return data.occupancy_esd.getFloat(data.atoms.rowIndex[data.atomIndex[i]]); }, typedArray: Float32Array, encoder: context_1.Encoders.occupancy });
    }
    if (data.B_iso_or_equiv_esd && data.B_iso_or_equiv_esd.getValuePresence(0) === 0 /* Present */) {
        fields.push({ name: 'B_iso_or_equiv_esd', string: function (data, i) { return data.B_iso_or_equiv_esd.getString(data.atoms.rowIndex[data.atomIndex[i]]); }, number: function (data, i) { return data.B_iso_or_equiv_esd.getFloat(data.atoms.rowIndex[data.atomIndex[i]]); }, typedArray: Float32Array, encoder: coordinateEncoder });
    }
    fields.push({ name: 'pdbx_PDB_model_num', string: function (data, i) { return data.modelId; } });
    return {
        data: data,
        count: data.atomIndex.length,
        desc: {
            name: '_atom_site',
            fields: fields
        }
    };
}
var Categories = {
    _entry: _entry,
    _entity: _entity,
    _exptl: _exptl,
    _cell: _cell,
    _symmetry: _symmetry,
    _struct_conf: _struct_conf,
    _struct_sheet_range: _struct_sheet_range,
    _struct_conn: _struct_conn,
    _struct_conn_type: _struct_conn_type,
    _chem_comp_bond: _chem_comp_bond,
    _pdbx_struct_assembly: _pdbx_struct_assembly,
    _pdbx_struct_assembly_gen: _pdbx_struct_assembly_gen,
    _pdbx_struct_oper_list: _pdbx_struct_oper_list,
    _struct_asym: _struct_asym,
    _entity_poly: _entity_poly,
    _pdbx_struct_mod_residue: _pdbx_struct_mod_residue,
    _atom_sites: _atom_sites
};
function format(writer, config, models) {
    var isEmpty = !models || !models.length || !models.some(function (m) { return m.fragments.length > 0; });
    var header = context_1.createResultHeaderCategory({ isEmpty: isEmpty, hasError: false }, config.queryType);
    var params = context_1.createParamsCategory(config.params);
    writer.writeCategory(header);
    writer.writeCategory(params);
    if (isEmpty)
        return;
    var context = mmCifContext.create(models[0].fragments.unionFragment(), models[0].model, config.data, config.params.common.lowPrecisionCoords);
    if (!config.params.common.atomSitesOnly) {
        for (var _i = 0, _a = config.includedCategories; _i < _a.length; _i++) {
            var cat = _a[_i];
            var f = Categories[cat];
            if (!f)
                continue;
            writer.writeCategory(f, [context]);
        }
    }
    var modelContexts = [context];
    for (var i = 1; i < models.length; i++) {
        modelContexts.push(mmCifContext.create(models[i].fragments.unionFragment(), models[i].model, config.data, config.params.common.lowPrecisionCoords));
    }
    writer.writeCategory(_atom_site, modelContexts);
}
exports.format = format;
