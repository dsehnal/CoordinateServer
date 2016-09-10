"use strict";
var Core = require('LiteMol-core');
var Context_1 = require('../Context');
var mmCifContext = (function () {
    function mmCifContext(fragment, model, data) {
        this.fragment = fragment;
        this.model = model;
        this.data = data;
    }
    Object.defineProperty(mmCifContext.prototype, "isComplete", {
        get: function () {
            return this.model.source === Core.Structure.MoleculeModelSource.File
                ? this.fragment.atomCount === this.model.atoms.count
                : false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(mmCifContext.prototype, "residueNameSet", {
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
    mmCifContext.prototype.computeModres = function () {
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
    Object.defineProperty(mmCifContext.prototype, "modifiedResidues", {
        get: function () {
            this.computeModres();
            return this._modres;
        },
        enumerable: true,
        configurable: true
    });
    mmCifContext.prototype.getSourceResidueStringId = function (i) {
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
    return mmCifContext;
}());
exports.mmCifContext = mmCifContext;
var SourceCategoryMap = (function () {
    function SourceCategoryMap(context, name, keyColumnName) {
        this.context = context;
        this.name = name;
        this.keyColumnName = keyColumnName;
        this.byKey = new Map();
        this.category = null;
        var cat = context.data.getCategory(name);
        if (!cat)
            return;
        var ci = cat.getColumnIndex(keyColumnName);
        if (ci < 0)
            return;
        this.category = cat;
        for (var i = 0; i < cat.rowCount; i++) {
            var id = cat.getStringValueFromIndex(ci, i);
            this.byKey.set(id, i);
        }
    }
    SourceCategoryMap.prototype.getValueOrDefault = function (id, columnName, def) {
        if (!this.category)
            return def;
        var row = this.byKey.get(id);
        if (row === void 0)
            return def;
        var v = this.category.getStringValue(columnName, row);
        if (v === null)
            return def;
        return v;
    };
    return SourceCategoryMap;
}());
function _entry(context) {
    return {
        data: context.model.id,
        desc: {
            name: '_entry',
            fields: [
                { name: 'id', string: function (id) { return id; }, encoder: Context_1.Encoders.strings }
            ]
        }
    };
}
function _entity(context) {
    var f = context.fragment;
    if (!f.entityIndices.length)
        return void 0;
    var uniqueEntities = new Set();
    var entityIndices = [];
    for (var _i = 0, _a = f.entityIndices; _i < _a.length; _i++) {
        var i = _a[_i];
        var id = context.model.entities.entityId[i];
        if (!uniqueEntities.has(id)) {
            entityIndices.push(i);
            uniqueEntities.add(id);
        }
    }
    entityIndices.sort(function (i, j) { return i - j; });
    var e = context.model.entities;
    var map = new SourceCategoryMap(context, '_entity', '_entity.id');
    var data = { id: e.entityId, type: e.type, index: entityIndices, map: map };
    var fields = [
        { name: 'id', string: function (data, i) { return data.id[data.index[i]]; } },
        { name: 'type', string: function (data, i) { return data.type[data.index[i]]; } },
        { name: 'src_method', string: function (data, i) { return data.map.getValueOrDefault(data.id[data.index[i]], '_entity.src_method', '?'); } },
        { name: 'pdbx_description', string: function (data, i) { return data.map.getValueOrDefault(data.id[data.index[i]], '_entity.pdbx_description', '?'); } },
        { name: 'formula_weight', string: function (data, i) { return '?'; } },
        { name: 'pdbx_number_of_molecules', string: function (data, i) { return '?'; } },
        { name: 'details', string: function (data, i) { return '?'; } },
        { name: 'pdbx_mutation', string: function (data, i) { return data.map.getValueOrDefault(data.id[data.index[i]], '_entity.pdbx_mutation', '?'); } },
        { name: 'pdbx_fragment', string: function (data, i) { return data.map.getValueOrDefault(data.id[data.index[i]], '_entity.pdbx_fragment', '?'); } },
        { name: 'pdbx_ec', string: function (data, i) { return data.map.getValueOrDefault(data.id[data.index[i]], '_entity.pdbx_ec', '?'); } }
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
function findSecondary(test, context) {
    if (!context.model.secondaryStructure)
        return;
    var starts = [], ends = [], lengths = [], ssIndices = [];
    var struct = context.model.secondaryStructure.filter(function (s) { return test(s.type); });
    if (!struct.length)
        return;
    var currentStructure = 0, currentStart = struct[0].startResidueIndex, currentEnd = struct[0].endResidueIndex;
    var residues = context.fragment.residueIndices;
    for (var k = 0, length_1 = residues.length; k < length_1;) {
        var residueIndex = residues[k];
        if (residueIndex >= currentStart && residueIndex < currentEnd) {
            var start = residueIndex;
            var slen = 0;
            while (k < length_1 && currentEnd > residues[k]) {
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
    var rs = context.model.residues;
    var data = { indices: ssIndices, residues: rs, index: context.fragment.residueIndices, helixCounter: 0, turnCounter: 0, helix: helix, turn: turn };
    var fields = [
        { name: 'conf_type_id', string: function (data, i) { return data.indices.struct[data.indices.ssIndices[i]].type === data.helix ? 'HELX_P' : 'TURN_P'; } },
        { name: 'id', string: function (data, i) { return data.indices.struct[data.indices.ssIndices[i]].type === data.helix ? 'HELX_P' + (++data.helixCounter) : 'TURN_P' + (++data.turnCounter); } },
        { name: 'pdbx_PDB_helix_id', string: function (data, i) { return (i + 1).toString(); } },
        { name: 'beg_label_comp_id', string: function (data, i) { return data.residues.name[data.indices.starts[i]]; } },
        { name: 'beg_label_asym_id', string: function (data, i) { return data.residues.asymId[data.indices.starts[i]]; } },
        { name: 'beg_label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.indices.starts[i]].toString(); } },
        { name: 'pdbx_beg_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.indices.starts[i]]; } },
        { name: 'end_label_comp_id', string: function (data, i) { return data.residues.name[data.indices.ends[i]]; } },
        { name: 'end_label_asym_id', string: function (data, i) { return data.residues.asymId[data.indices.ends[i]]; } },
        { name: 'end_label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.indices.ends[i]].toString(); } },
        { name: 'pdbx_end_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.indices.ends[i]]; } },
        { name: 'beg_auth_comp_id', string: function (data, i) { return data.residues.authName[data.indices.starts[i]]; } },
        { name: 'beg_auth_asym_id', string: function (data, i) { return data.residues.authAsymId[data.indices.starts[i]]; } },
        { name: 'beg_auth_seq_id', string: function (data, i) { return data.residues.authSeqNumber[data.indices.starts[i]].toString(); } },
        { name: 'end_auth_comp_id', string: function (data, i) { return data.residues.authName[data.indices.ends[i]]; } },
        { name: 'end_auth_asym_id', string: function (data, i) { return data.residues.authAsymId[data.indices.ends[i]]; } },
        { name: 'end_auth_seq_id', string: function (data, i) { return data.residues.authSeqNumber[data.indices.ends[i]].toString(); } },
        { name: 'pdbx_PDB_helix_class', string: function (data, i) { var val = data.indices.struct[data.indices.ssIndices[i]].info.helixClass; return val !== null && val !== undefined ? '' + val : '?'; } },
        { name: 'details', string: function (data, i) { return '?'; } },
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
    var rs = context.model.residues;
    var data = { indices: ssIndices, residues: rs, index: context.fragment.residueIndices };
    var fields = [
        { name: 'sheet_id', string: function (data, i) { var val = data.indices.struct[data.indices.ssIndices[i]].info.sheetId; return val !== null && val !== undefined ? '' + val : (i + 1).toString(); } },
        { name: 'id', string: function (data, i) { var val = data.indices.struct[data.indices.ssIndices[i]].info.id; return val !== null && val !== undefined ? '' + val : (i + 1).toString(); } },
        { name: 'beg_label_comp_id', string: function (data, i) { return data.residues.name[data.indices.starts[i]]; } },
        { name: 'beg_label_asym_id', string: function (data, i) { return data.residues.asymId[data.indices.starts[i]]; } },
        { name: 'beg_label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.indices.starts[i]].toString(); } },
        { name: 'pdbx_beg_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.indices.starts[i]]; } },
        { name: 'end_label_comp_id', string: function (data, i) { return data.residues.name[data.indices.ends[i]]; } },
        { name: 'end_label_asym_id', string: function (data, i) { return data.residues.asymId[data.indices.ends[i]]; } },
        { name: 'end_label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.indices.ends[i]].toString(); } },
        { name: 'pdbx_end_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.indices.ends[i]]; } },
        { name: 'symmetry', string: function (data, i) { var val = data.indices.struct[data.indices.ssIndices[i]].info.symmetry; return val !== null && val !== undefined ? '' + val : '?'; } },
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
function _chem_comp_bond(context) {
    var cat = context.data.getCategory('_chem_comp_bond');
    if (!cat)
        return;
    var cols = cat.columnArray;
    var nameCol = cat.getColumn('_chem_comp_bond.comp_id');
    if (!nameCol)
        return;
    var rows = [];
    var names = context.residueNameSet;
    for (var i = 0, _l = cat.rowCount; i < _l; i++) {
        var n = nameCol.getString(i);
        if (names.has(n))
            rows[rows.length] = i;
    }
    if (!rows.length)
        return;
    var data = {
        rows: rows,
        cat: cat,
        comp_id: cat.getColumn('_chem_comp_bond.comp_id'),
        pdbx_stereo_config: cat.getColumn('_chem_comp_bond.pdbx_stereo_config'),
        pdbx_ordinal: cat.getColumn('_chem_comp_bond.pdbx_ordinal'),
        pdbx_aromatic_flag: cat.getColumn('_chem_comp_bond.pdbx_aromatic_flag'),
        atom_id_1: cat.getColumn('_chem_comp_bond.atom_id_1'),
        atom_id_2: cat.getColumn('_chem_comp_bond.atom_id_2'),
        value_order: cat.getColumn('_chem_comp_bond.value_order')
    };
    var fields = [
        { name: 'comp_id', string: function (data, i) { return data.comp_id.getString(data.rows[i]); } },
        { name: 'pdbx_stereo_config', string: function (data, i) { return data.pdbx_stereo_config.getString(data.rows[i]); } },
        { name: 'pdbx_ordinal', string: function (data, i) { return data.pdbx_ordinal.getString(data.rows[i]); }, number: function (data, i) { return data.pdbx_ordinal.getInteger(data.rows[i]); }, typedArray: Uint32Array, encoder: Context_1.Encoders.ids },
        { name: 'pdbx_aromatic_flag', string: function (data, i) { return data.pdbx_aromatic_flag.getString(data.rows[i]); } },
        { name: 'atom_id_1', string: function (data, i) { return data.atom_id_1.getString(data.rows[i]); } },
        { name: 'atom_id_2', string: function (data, i) { return data.atom_id_2.getString(data.rows[i]); } },
        { name: 'value_order', string: function (data, i) { return data.value_order.getString(data.rows[i]); } }
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
function _struct_asym(context) {
    var data = { index: context.fragment.chainIndices, chains: context.model.chains, parent: context.model.parent };
    var fields = [
        { name: 'id', string: function (data, i) { return data.chains.asymId[data.index[i]]; } },
        { name: 'pdbx_blank_PDB_chainid_flag', string: function (data, i) { return !data.chains.asymId[data.index[i]] ? 'Y' : 'N'; } },
        { name: 'pdbx_modified', string: function (data, i) { return 'Y'; } },
        { name: 'entity_id', string: function (data, i) { return data.chains.entityId[data.index[i]]; } },
        {
            name: 'details', string: function (data, i) {
                var idx = data.index[i];
                if (data.chains.sourceChainIndex && data.parent) {
                    if (data.parent.chains.asymId[data.chains.sourceChainIndex[idx]] !== data.chains.asymId[idx]) {
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
    var entityMap = new Map();
    var poly = [];
    for (var i = 0; i < cat.rowCount; i++) {
        var eId = cat.getStringValue('_entity_poly.entity_id', i);
        var e = {
            entity_id: eId,
            type: cat.getStringValue('_entity_poly.type', i),
            nstd_linkage: cat.getStringValue('_entity_poly.nstd_linkage', i),
            nstd_monomer: cat.getStringValue('_entity_poly.nstd_monomer', i),
            pdbx_seq_one_letter_code: cat.getStringValue('_entity_poly.pdbx_seq_one_letter_code', i),
            pdbx_seq_one_letter_code_can: cat.getStringValue('_entity_poly.pdbx_seq_one_letter_code_can', i),
            pdbx_strand_id: '',
            strand_set: new Set()
        };
        entityMap.set(eId, e);
        poly.push(e);
    }
    var chains = context.model.chains;
    var residues = context.model.residues;
    var modRes = context.modifiedResidues;
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
        { name: 'type', string: function (data, i) { return data[i].type; } },
        { name: 'nstd_linkage', string: function (data, i) { return data[i].nstd_linkage; } },
        { name: 'nstd_monomer', string: function (data, i) { return data[i].nstd_monomer; } },
        { name: 'pdbx_seq_one_letter_code', string: function (data, i) { return data[i].pdbx_seq_one_letter_code; } },
        { name: 'pdbx_seq_one_letter_code_can', string: function (data, i) { return data[i].pdbx_seq_one_letter_code_can; } },
        { name: 'pdbx_strand_id', string: function (data, i) { return data[i].pdbx_strand_id; } }
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
    var info = context.modifiedResidues;
    if (!info.map.size)
        return;
    var names = context.model.residues.name;
    for (var _i = 0, _a = context.fragment.residueIndices; _i < _a.length; _i++) {
        var res = _a[_i];
        if (!info.names.has(names[res]))
            continue;
        var e = info.map.get(context.getSourceResidueStringId(res));
        if (e) {
            modResIndices[modResIndices.length] = e.i;
            residues[residues.length] = res;
        }
    }
    var data = { cat: cat, modResIndices: modResIndices, residues: residues, resTable: context.model.residues };
    var fields = [
        { name: 'id', string: function (data, i) { return (i + 1).toString(); } },
        { name: 'label_asym_id', string: function (data, i) { return data.resTable.asymId[data.residues[i]]; } },
        { name: 'label_seq_id', string: function (data, i) { return data.resTable.seqNumber[data.residues[i]].toString(); }, number: function (data, i) { return data.resTable.seqNumber[data.residues[i]]; }, typedArray: Int32Array, encoder: Context_1.Encoders.ids },
        { name: 'label_comp_id', string: function (data, i) { return data.resTable.name[data.residues[i]]; } },
        { name: 'auth_asym_id', string: function (data, i) { return data.resTable.authAsymId[data.residues[i]]; } },
        { name: 'auth_seq_id', string: function (data, i) { return data.resTable.authSeqNumber[data.residues[i]].toString(); }, number: function (data, i) { return data.resTable.authSeqNumber[data.residues[i]]; }, typedArray: Int32Array, encoder: Context_1.Encoders.ids },
        { name: 'auth_comp_id', string: function (data, i) { return data.resTable.authName[data.residues[i]]; } },
        { name: 'PDB_ins_code', string: function (data, i) { return data.resTable.insCode[data.residues[i]]; } },
        { name: 'parent_comp_id', string: function (data, i) { return data.cat.getStringValue('_pdbx_struct_mod_residue.parent_comp_id', data.modResIndices[i]); } },
        { name: 'details', string: function (data, i) { return data.cat.getStringValue('_pdbx_struct_mod_residue.details', data.modResIndices[i]); } }
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
function _atom_site(context) {
    //_atom_site.Cartn_x_esd
    //_atom_site.Cartn_y_esd
    //_atom_site.Cartn_z_esd
    //_atom_site.occupancy_esd
    //_atom_site.B_iso_or_equiv_esd
    //--_atom_site.pdbe_label_seq_id 
    var cat = context.data.getCategory('_atom_site');
    var data = {
        xs: context.fragment.atomIndices,
        atoms: context.model.atoms,
        residues: context.model.residues,
        chains: context.model.chains,
        entities: context.model.entities,
        modelId: context.model.modelId,
        pdbx_formal_charge: cat.getColumn('_atom_site.pdbx_formal_charge'),
    };
    var fields = [
        { name: 'group_PDB', string: function (data, i) { return data.residues.isHet[data.atoms.residueIndex[data.xs[i]]] ? 'HETATM' : 'ATOM'; } },
        { name: 'id', string: function (data, i) { return data.atoms.id[data.xs[i]].toString(); }, number: function (data, i) { return data.atoms.id[data.xs[i]]; }, typedArray: Int32Array, encoder: Context_1.Encoders.ids },
        { name: 'type_symbol', string: function (data, i) { return data.atoms.elementSymbol[data.xs[i]]; } },
        { name: 'label_atom_id', string: function (data, i) { return data.atoms.name[data.xs[i]]; } },
        { name: 'label_alt_id', string: function (data, i) { return data.atoms.altLoc[data.xs[i]]; } },
        { name: 'label_comp_id', string: function (data, i) { return data.residues.name[data.atoms.residueIndex[data.xs[i]]]; } },
        { name: 'label_asym_id', string: function (data, i) { return data.chains.asymId[data.atoms.chainIndex[data.xs[i]]]; } },
        { name: 'label_entity_id', string: function (data, i) { return data.entities.entityId[data.atoms.entityIndex[data.xs[i]]]; } },
        { name: 'label_seq_id', string: function (data, i) { return data.residues.seqNumber[data.atoms.residueIndex[data.xs[i]]].toString(); }, number: function (data, i) { return data.residues.seqNumber[data.atoms.residueIndex[data.xs[i]]]; }, typedArray: Int32Array, encoder: Context_1.Encoders.ids },
        { name: 'pdbx_PDB_ins_code', string: function (data, i) { return data.residues.insCode[data.atoms.residueIndex[data.xs[i]]]; } },
        { name: 'Cartn_x', string: function (data, i) { return '' + Math.round(1000 * data.atoms.x[data.xs[i]]) / 1000; }, number: function (data, i) { return Math.round(1000 * data.atoms.x[data.xs[i]]) / 1000; }, typedArray: Float32Array, encoder: Context_1.Encoders.coordinates },
        { name: 'Cartn_y', string: function (data, i) { return '' + Math.round(1000 * data.atoms.y[data.xs[i]]) / 1000; }, number: function (data, i) { return Math.round(1000 * data.atoms.y[data.xs[i]]) / 1000; }, typedArray: Float32Array, encoder: Context_1.Encoders.coordinates },
        { name: 'Cartn_z', string: function (data, i) { return '' + Math.round(1000 * data.atoms.z[data.xs[i]]) / 1000; }, number: function (data, i) { return Math.round(1000 * data.atoms.z[data.xs[i]]) / 1000; }, typedArray: Float32Array, encoder: Context_1.Encoders.coordinates },
        { name: 'occupancy', string: function (data, i) { return '' + Math.round(100 * data.atoms.occupancy[data.xs[i]]) / 100; }, number: function (data, i) { return Math.round(100 * data.atoms.occupancy[data.xs[i]]) / 100; }, typedArray: Float32Array, encoder: Context_1.Encoders.occupancy },
        { name: 'B_iso_or_equiv', string: function (data, i) { return '' + Math.round(100 * data.atoms.tempFactor[data.xs[i]]) / 100; }, number: function (data, i) { return Math.round(100 * data.atoms.tempFactor[data.xs[i]]) / 100; }, typedArray: Float32Array, encoder: Context_1.Encoders.coordinates },
        { name: 'pdbx_formal_charge', string: function (data, i) { return data.pdbx_formal_charge.getString(data.atoms.rowIndex[data.xs[i]]); } },
        { name: 'auth_atom_id', string: function (data, i) { return data.atoms.authName[data.xs[i]]; } },
        { name: 'auth_comp_id', string: function (data, i) { return data.residues.authName[data.atoms.residueIndex[data.xs[i]]]; } },
        { name: 'auth_asym_id', string: function (data, i) { return data.chains.authAsymId[data.atoms.chainIndex[data.xs[i]]]; } },
        { name: 'auth_seq_id', string: function (data, i) { return data.residues.authSeqNumber[data.atoms.residueIndex[data.xs[i]]].toString(); }, number: function (data, i) { return data.residues.authSeqNumber[data.atoms.residueIndex[data.xs[i]]]; }, typedArray: Int32Array, encoder: Context_1.Encoders.ids },
        { name: 'pdbx_PDB_model_num', string: function (data, i) { return data.modelId; } },
    ];
    return {
        data: data,
        count: data.xs.length,
        desc: {
            name: '_atom_site',
            fields: fields
        }
    };
}
var Categories = {
    _entry: _entry,
    _entity: _entity,
    _struct_conf: _struct_conf,
    _struct_sheet_range: _struct_sheet_range,
    _chem_comp_bond: _chem_comp_bond,
    _struct_asym: _struct_asym,
    _entity_poly: _entity_poly,
    _pdbx_struct_mod_residue: _pdbx_struct_mod_residue
};
function format(writer, config, models) {
    var isEmpty = !models || !models.length || !models.some(function (m) { return m.fragments.length > 0; });
    var header = Context_1.createResultHeaderCategory({ isEmpty: isEmpty, hasError: false }, config.queryType);
    var params = Context_1.createParamsCategory(config.params);
    writer.writeCategory(header);
    writer.writeCategory(params);
    var unionFragment = models[0].fragments.unionFragment();
    var context = new mmCifContext(unionFragment, models[0].model, config.data);
    for (var _i = 0, _a = config.includedCategories; _i < _a.length; _i++) {
        var cat = _a[_i];
        var f = Categories[cat];
        if (!f)
            continue;
        writer.writeCategory(f, context);
    }
    writer.writeCategory(_atom_site, context);
}
exports.format = format;
