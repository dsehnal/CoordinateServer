import * as Core from 'LiteMol-core'
import { Context, CategoryInstance, CategoryProvider, FieldDesc, Encoders, FormatConfig, WritableFragments, Writer, createResultHeaderCategory, createParamsCategory } from '../Context'

export class mmCifContext implements Context {
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

class SourceCategoryMap {
    private byKey = new Map<string, number>();
    private category: LiteMol.Core.Formats.CIF.Category = null;

    getValueOrDefault(id: string, columnName: string, def: string) {
        if (!this.category) return def;
        let row = this.byKey.get(id);
        if (row === void 0) return def;
        let v = this.category.getStringValue(columnName, row);
        if (v === null) return def;
        return v;
    }

    constructor(private context: mmCifContext, private name: string, private keyColumnName: string) {
        let cat = context.data.getCategory(name);
        if (!cat) return;
        let ci = cat.getColumnIndex(keyColumnName);
        if (ci < 0) return;
        this.category = cat;
        for (let i = 0; i < cat.rowCount; i++) {
            let id = cat.getStringValueFromIndex(ci, i);
            this.byKey.set(id, i);
        }
    }
}


function _entry(context: mmCifContext) {    
    return <CategoryInstance<string>>{
        data: context.model.id,
        desc: {
            name: '_entry',
            fields: [
                { name: 'id', string: id => id, encoder: Encoders.strings }
            ]
        }
    };
}

function _entity(context: mmCifContext) {
    let f = context.fragment;
    if (!f.entityIndices.length) return void 0;

    let uniqueEntities = new Set<string>();
    let entityIndices: number[] = [];
    for (let i of f.entityIndices) {
        let id = context.model.entities.entityId[i];
        if (!uniqueEntities.has(id)) {
            entityIndices.push(i);
            uniqueEntities.add(id);
        }
    }

    entityIndices.sort((i, j) => i - j);

    let e = context.model.entities;

    let map = new SourceCategoryMap(context, '_entity', '_entity.id');

    let data = { id: e.entityId, type: e.type, index: entityIndices, map };
    let fields: FieldDesc<typeof data>[] = [
        { name: 'id', string: (data, i) => data.id[data.index[i]] },
        { name: 'type', string: (data, i) => data.type[data.index[i]] },
        { name: 'src_method', string: (data, i) => data.map.getValueOrDefault(data.id[data.index[i]], '_entity.src_method', '?') },
        { name: 'pdbx_description', string: (data, i) => data.map.getValueOrDefault(data.id[data.index[i]], '_entity.pdbx_description', '?') },
        { name: 'formula_weight', string: (data, i) => '?' },
        { name: 'pdbx_number_of_molecules', string: (data, i) => '?' },
        { name: 'details', string: (data, i) => '?' },
        { name: 'pdbx_mutation', string: (data, i) => data.map.getValueOrDefault(data.id[data.index[i]], '_entity.pdbx_mutation', '?') },
        { name: 'pdbx_fragment', string: (data, i) => data.map.getValueOrDefault(data.id[data.index[i]], '_entity.pdbx_fragment', '?') },
        { name: 'pdbx_ec', string: (data, i) => data.map.getValueOrDefault(data.id[data.index[i]], '_entity.pdbx_ec', '?') }
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: entityIndices.length,
        desc: {
            name: '_entity',
            fields
        }
    };
}


function findSecondary(test: (t: Core.Structure.SecondaryStructureType) => boolean, context: mmCifContext) {
    if (!context.model.secondaryStructure) return;

    let starts: number[] = [], ends: number[] = [], lengths: number[] = [],
        ssIndices: number[] = [];

    let struct = context.model.secondaryStructure.filter(s => test(s.type));

    if (!struct.length) return;

    let currentStructure = 0, currentStart = struct[0].startResidueIndex, currentEnd = struct[0].endResidueIndex;

    let residues = context.fragment.residueIndices;

    for (let k = 0, length = residues.length; k < length;) {

        let residueIndex = residues[k];
        if (residueIndex >= currentStart && residueIndex < currentEnd) {
            let start = residueIndex;
            let slen = 0;

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
            if (currentStructure >= struct.length) break;
            currentStart = struct[currentStructure].startResidueIndex;
            currentEnd = struct[currentStructure].endResidueIndex;
        } else {
            while (residueIndex >= currentEnd) {
                currentStructure++;
                if (currentStructure >= struct.length) break;
                currentStart = struct[currentStructure].startResidueIndex;
                currentEnd = struct[currentStructure].endResidueIndex;
            }
            if (currentStructure >= struct.length) break;

            if (residueIndex < currentStart) k++;
        }
    }

    return { starts, ends, lengths, ssIndices, struct };
}

function _struct_conf(context: mmCifContext) {
    let helix = Core.Structure.SecondaryStructureType.Helix, turn = Core.Structure.SecondaryStructureType.Turn;

    let ssIndices = findSecondary(t => t === helix || t === turn, context);
    if (!ssIndices || !ssIndices.starts.length) return;

    let rs = context.model.residues;
    let data = { indices: ssIndices, residues: rs, index: context.fragment.residueIndices, helixCounter: 0, turnCounter: 0, helix, turn };
    let fields: FieldDesc<typeof data>[] = [
        { name: 'conf_type_id', string: (data, i) => data.indices.struct[data.indices.ssIndices[i]].type === data.helix ? 'HELX_P' : 'TURN_P' },
        { name: 'id', string: (data, i) => data.indices.struct[data.indices.ssIndices[i]].type === data.helix ? 'HELX_P' + (++data.helixCounter) : 'TURN_P' + (++data.turnCounter) },
        { name: 'pdbx_PDB_helix_id', string: (data, i) => (i + 1).toString() },

        { name: 'beg_label_comp_id', string: (data, i) => data.residues.name[data.indices.starts[i]] },
        { name: 'beg_label_asym_id', string: (data, i) => data.residues.asymId[data.indices.starts[i]] },
        { name: 'beg_label_seq_id', string: (data, i) => data.residues.seqNumber[data.indices.starts[i]].toString() },
        { name: 'pdbx_beg_PDB_ins_code', string: (data, i) => data.residues.insCode[data.indices.starts[i]] },

        { name: 'end_label_comp_id', string: (data, i) => data.residues.name[data.indices.ends[i]] },
        { name: 'end_label_asym_id', string: (data, i) => data.residues.asymId[data.indices.ends[i]] },
        { name: 'end_label_seq_id', string: (data, i) => data.residues.seqNumber[data.indices.ends[i]].toString() },
        { name: 'pdbx_end_PDB_ins_code', string: (data, i) => data.residues.insCode[data.indices.ends[i]] },

        { name: 'beg_auth_comp_id', string: (data, i) => data.residues.authName[data.indices.starts[i]] },
        { name: 'beg_auth_asym_id', string: (data, i) => data.residues.authAsymId[data.indices.starts[i]] },
        { name: 'beg_auth_seq_id', string: (data, i) => data.residues.authSeqNumber[data.indices.starts[i]].toString() },

        { name: 'end_auth_comp_id', string: (data, i) => data.residues.authName[data.indices.ends[i]] },
        { name: 'end_auth_asym_id', string: (data, i) => data.residues.authAsymId[data.indices.ends[i]] },
        { name: 'end_auth_seq_id', string: (data, i) => data.residues.authSeqNumber[data.indices.ends[i]].toString() },

        { name: 'pdbx_PDB_helix_class', string: (data, i) => { let val = data.indices.struct[data.indices.ssIndices[i]].info.helixClass; return val !== null && val !== undefined ? '' + val : '?' } },
        { name: 'details', string: (data, i) => '?' },

        { name: 'pdbx_PDB_helix_length', string: (data, i) => data.indices.lengths[i].toString() }
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: ssIndices.starts.length,
        desc: {
            name: '_struct_conf',
            fields
        }
    };
}

function _struct_sheet_range(context: mmCifContext) {
    let sheet = Core.Structure.SecondaryStructureType.Sheet;
    let ssIndices = findSecondary(t => t === sheet, context);
    if (!ssIndices || !ssIndices.starts.length) return;

    let rs = context.model.residues;
    let data = { indices: ssIndices, residues: rs, index: context.fragment.residueIndices };
    let fields: FieldDesc<typeof data>[] = [
        { name: 'sheet_id', string: (data, i) => { let val = data.indices.struct[data.indices.ssIndices[i]].info.sheetId; return val !== null && val !== undefined ? '' + val : (i + 1).toString() } },
        { name: 'id', string: (data, i) => { let val = data.indices.struct[data.indices.ssIndices[i]].info.id; return val !== null && val !== undefined ? '' + val : (i + 1).toString() } },

        { name: 'beg_label_comp_id', string: (data, i) => data.residues.name[data.indices.starts[i]] },
        { name: 'beg_label_asym_id', string: (data, i) => data.residues.asymId[data.indices.starts[i]] },
        { name: 'beg_label_seq_id', string: (data, i) => data.residues.seqNumber[data.indices.starts[i]].toString() },
        { name: 'pdbx_beg_PDB_ins_code', string: (data, i) => data.residues.insCode[data.indices.starts[i]] },

        { name: 'end_label_comp_id', string: (data, i) => data.residues.name[data.indices.ends[i]] },
        { name: 'end_label_asym_id', string: (data, i) => data.residues.asymId[data.indices.ends[i]] },
        { name: 'end_label_seq_id', string: (data, i) => data.residues.seqNumber[data.indices.ends[i]].toString() },
        { name: 'pdbx_end_PDB_ins_code', string: (data, i) => data.residues.insCode[data.indices.ends[i]] },

        { name: 'symmetry', string: (data, i) => { let val = data.indices.struct[data.indices.ssIndices[i]].info.symmetry; return val !== null && val !== undefined ? '' + val : '?' } },

        { name: 'beg_auth_comp_id', string: (data, i) => data.residues.authName[data.indices.starts[i]] },
        { name: 'beg_auth_asym_id', string: (data, i) => data.residues.authAsymId[data.indices.starts[i]] },
        { name: 'beg_auth_seq_id', string: (data, i) => data.residues.authSeqNumber[data.indices.starts[i]].toString() },

        { name: 'end_auth_comp_id', string: (data, i) => data.residues.authName[data.indices.ends[i]] },
        { name: 'end_auth_asym_id', string: (data, i) => data.residues.authAsymId[data.indices.ends[i]] },
        { name: 'end_auth_seq_id', string: (data, i) => data.residues.authSeqNumber[data.indices.ends[i]].toString() },
    ];
    
    return <CategoryInstance<typeof data>>{
        data,
        count: ssIndices.starts.length,
        desc: {
            name: '_struct_sheet_range',
            fields
        }
    };
}

function _chem_comp_bond(context: mmCifContext) {
    let cat = context.data.getCategory('_chem_comp_bond');
    if (!cat) return;
        
    let cols = cat.columnArray;
    let nameCol = cat.getColumn('_chem_comp_bond.comp_id');
    if (!nameCol) return;
    let rows: number[] = [];
    let names = context.residueNameSet;

    for (let i = 0, _l = cat.rowCount; i < _l; i++) {
        let n = nameCol.getString(i);
        if (names.has(n)) rows[rows.length] = i;
    }

    if (!rows.length) return;

    let data = {
        rows,
        comp_id: cat.getColumn('_chem_comp_bond.comp_id'),
        pdbx_stereo_config: cat.getColumn('_chem_comp_bond.pdbx_stereo_config'),
        pdbx_ordinal: cat.getColumn('_chem_comp_bond.pdbx_ordinal'),
        pdbx_aromatic_flag: cat.getColumn('_chem_comp_bond.pdbx_aromatic_flag'),
        atom_id_1: cat.getColumn('_chem_comp_bond.atom_id_1'),
        atom_id_2: cat.getColumn('_chem_comp_bond.atom_id_2'),
        value_order: cat.getColumn('_chem_comp_bond.value_order')
    };

    let fields: FieldDesc<typeof data>[] = [
        { name: 'comp_id', string: (data, i) => data.comp_id.getString(data.rows[i]) },
        { name: 'pdbx_stereo_config', string: (data, i) => data.pdbx_stereo_config.getString(data.rows[i]) },
        { name: 'pdbx_ordinal', string: (data, i) => data.pdbx_ordinal.getString(data.rows[i]), number: (data, i) => data.pdbx_ordinal.getInteger(data.rows[i]), typedArray: Int32Array, encoder: Encoders.ids },
        { name: 'pdbx_aromatic_flag', string: (data, i) => data.pdbx_aromatic_flag.getString(data.rows[i]) },
        { name: 'atom_id_1', string: (data, i) => data.atom_id_1.getString(data.rows[i]) },
        { name: 'atom_id_2', string: (data, i) => data.atom_id_2.getString(data.rows[i]) },
        { name: 'value_order', string: (data, i) => data.value_order.getString(data.rows[i]) }
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: rows.length,
        desc: {
            name: '_chem_comp_bond',
            fields
        }
    };
}

function float64field<T>(name: string, value: (data: T, i: number) => number): FieldDesc<T> {
    return { name, string: (data, i) => value(data, i).toString(), number: value, typedArray: Float64Array, encoder: Encoders.float64 };
}

function int32field<T>(name: string, value: (data: T, i: number) => number): FieldDesc<T> {
    return { name, string: (data, i) => value(data, i).toString(), number: value, typedArray: Int32Array, encoder: Encoders.int32 };
}

function _cell(context: mmCifContext) {
    let cat = context.data.getCategory('_cell');
    if (!cat || !cat.rowCount) return;

    let rows: number[] = [];
    for (let i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }

    let data = {
        rows,
        entry_id: cat.getColumn('_cell.entry_id'),
        length_a: cat.getColumn('_cell.length_a'),
        length_b: cat.getColumn('_cell.length_b'),
        length_c: cat.getColumn('_cell.length_c'),
        angle_alpha: cat.getColumn('_cell.angle_alpha'),
        angle_beta: cat.getColumn('_cell.angle_beta'),
        angle_gamma: cat.getColumn('_cell.angle_gamma'),
        Z_PDB: cat.getColumn('_cell.Z_PDB'),
        pdbx_unique_axis: cat.getColumn('_cell.pdbx_unique_axis')
    };

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        { name: 'entry_id', string: (data, i) => data.entry_id.getString(data.rows[i]) },
        float64field<T>('length_a', (data, i) => data.length_a.getFloat(data.rows[i])),
        float64field<T>('length_b', (data, i) => data.length_b.getFloat(data.rows[i])),
        float64field<T>('length_c', (data, i) => data.length_c.getFloat(data.rows[i])),
        float64field<T>('angle_alpha', (data, i) => data.angle_alpha.getFloat(data.rows[i])),
        float64field<T>('angle_beta', (data, i) => data.angle_beta.getFloat(data.rows[i])),
        float64field<T>('angle_gamma', (data, i) => data.angle_gamma.getFloat(data.rows[i])),
        int32field<T>('Z_PDB', (data, i) => data.Z_PDB.getFloat(data.rows[i])),
        { name: 'pdbx_unique_axis', string: (data, i) => data.pdbx_unique_axis.getString(data.rows[i]) }
    ];

    return <CategoryInstance<T>>{
        data,
        count: rows.length,
        desc: {
            name: '_cell',
            fields
        }
    };
}

function _symmetry(context: mmCifContext) {
    let cat = context.data.getCategory('_symmetry');
    if (!cat || !cat.rowCount) return;

    let rows: number[] = [];
    for (let i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }

    let data = {
        rows,
        entry_id: cat.getColumn('_symmetry.entry_id'),
        space_group_name_HM: cat.getColumn('_symmetry.space_group_name_H-M'),
        pdbx_full_space_group_name_HM: cat.getColumn('_symmetry.pdbx_full_space_group_name_H-M'),
        cell_setting: cat.getColumn('_symmetry.cell_setting'),
        Int_Tables_number: cat.getColumn('_symmetry.Int_Tables_number'),
        space_group_name_Hall: cat.getColumn('_symmetry.space_group_name_Hall')
    };

    let fields: FieldDesc<typeof data>[] = [
        { name: 'entry_id', string: (data, i) => data.entry_id.getString(data.rows[i]) },
        { name: 'space_group_name_H-M', string: (data, i) => data.space_group_name_HM.getString(data.rows[i]) },
        { name: 'pdbx_full_space_group_name_H-M', string: (data, i) => data.pdbx_full_space_group_name_HM.getString(data.rows[i]) },
        { name: 'cell_setting', string: (data, i) => data.cell_setting.getString(data.rows[i]) },
        { name: 'Int_Tables_number', string: (data, i) => data.Int_Tables_number.getString(data.rows[i]) },
        { name: 'space_group_name_Hall', string: (data, i) => data.space_group_name_Hall.getString(data.rows[i]) },
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: rows.length,
        desc: {
            name: '_symmetry',
            fields
        }
    };
}


function _pdbx_struct_assembly(context: mmCifContext) {
    let cat = context.data.getCategory('_pdbx_struct_assembly');
    if (!cat || !cat.rowCount) return;

    let rows: number[] = [];
    for (let i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }

    let data = {
        rows,
        id: cat.getColumn('_pdbx_struct_assembly.id'),
        details: cat.getColumn('_pdbx_struct_assembly.details'),
        method_details: cat.getColumn('_pdbx_struct_assembly.method_details'),
        oligomeric_details: cat.getColumn('_pdbx_struct_assembly.oligomeric_details'),
        oligomeric_count: cat.getColumn('_pdbx_struct_assembly.oligomeric_count')
    };

    let fields: FieldDesc<typeof data>[] = [
        { name: 'id', string: (data, i) => data.id.getString(data.rows[i]) },
        { name: 'details', string: (data, i) => data.details.getString(data.rows[i]) },
        { name: 'method_details', string: (data, i) => data.method_details.getString(data.rows[i]) },
        { name: 'oligomeric_details', string: (data, i) => data.oligomeric_details.getString(data.rows[i]) },
        int32field<typeof data>('oligomeric_count', (data, i) => data.oligomeric_count.getInteger(data.rows[i]))
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: rows.length,
        desc: {
            name: '_pdbx_struct_assembly',
            fields
        }
    };
}

function _pdbx_struct_assembly_gen(context: mmCifContext) {
    let cat = context.data.getCategory('_pdbx_struct_assembly_gen');
    if (!cat || !cat.rowCount) return;

    let rows: number[] = [];
    for (let i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }

    let data = {
        rows,
        assembly_id: cat.getColumn('_pdbx_struct_assembly_gen.assembly_id'),
        oper_expression: cat.getColumn('_pdbx_struct_assembly_gen.oper_expression'),
        asym_id_list: cat.getColumn('_pdbx_struct_assembly_gen.asym_id_list')
    };

    let fields: FieldDesc<typeof data>[] = [
        { name: 'assembly_id', string: (data, i) => data.assembly_id.getString(data.rows[i]) },
        { name: 'oper_expression', string: (data, i) => data.oper_expression.getString(data.rows[i]) },
        { name: 'asym_id_list', string: (data, i) => data.asym_id_list.getString(data.rows[i]) }
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: rows.length,
        desc: {
            name: '_pdbx_struct_assembly_gen',
            fields
        }
    };
}

function _pdbx_struct_oper_list(context: mmCifContext) {
    let cat = context.data.getCategory('_pdbx_struct_oper_list');
    if (!cat || !cat.rowCount) return;

    let rows: number[] = [];
    for (let i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }

    let data = {
        rows,
        id: cat.getColumn('_pdbx_struct_oper_list.id'),
        type: cat.getColumn('_pdbx_struct_oper_list.type'),
        name: cat.getColumn('_pdbx_struct_oper_list.name'),
        symmetry_operation: cat.getColumn('_pdbx_struct_oper_list.symmetry_operation'),
        matrix11: cat.getColumn('_pdbx_struct_oper_list.matrix[1][1]'),
        matrix12: cat.getColumn('_pdbx_struct_oper_list.matrix[1][2]'),
        matrix13: cat.getColumn('_pdbx_struct_oper_list.matrix[1][3]'),
        vector1:  cat.getColumn('_pdbx_struct_oper_list.vector[1]'),
        matrix21: cat.getColumn('_pdbx_struct_oper_list.matrix[2][1]'),
        matrix22: cat.getColumn('_pdbx_struct_oper_list.matrix[2][2]'),
        matrix23: cat.getColumn('_pdbx_struct_oper_list.matrix[2][3]'),
        vector2:  cat.getColumn('_pdbx_struct_oper_list.vector[2]'),
        matrix31: cat.getColumn('_pdbx_struct_oper_list.matrix[3][1]'),
        matrix32: cat.getColumn('_pdbx_struct_oper_list.matrix[3][2]'),
        matrix33: cat.getColumn('_pdbx_struct_oper_list.matrix[3][3]'),
        vector3:  cat.getColumn('_pdbx_struct_oper_list.vector[3]')
    };

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        { name: 'id', string: (data, i) => data.id.getString(data.rows[i]) },
        { name: 'type', string: (data, i) => data.type.getString(data.rows[i]) },
        { name: 'name', string: (data, i) => data.name.getString(data.rows[i]) },
        { name: 'symmetry_operation', string: (data, i) => data.symmetry_operation.getString(data.rows[i]) },

        float64field<T>('matrix[1][1]', (data, i) => data.matrix11.getFloat(data.rows[i])),
        float64field<T>('matrix[1][2]', (data, i) => data.matrix12.getFloat(data.rows[i])),
        float64field<T>('matrix[1][3]', (data, i) => data.matrix13.getFloat(data.rows[i])),
        float64field<T>('vector[1]', (data, i) => data.vector1.getFloat(data.rows[i])),

        float64field<T>('matrix[2][1]', (data, i) => data.matrix21.getFloat(data.rows[i])),
        float64field<T>('matrix[2][2]', (data, i) => data.matrix22.getFloat(data.rows[i])),
        float64field<T>('matrix[2][3]', (data, i) => data.matrix23.getFloat(data.rows[i])),
        float64field<T>('vector[2]', (data, i) => data.vector2.getFloat(data.rows[i])),

        float64field<T>('matrix[3][1]', (data, i) => data.matrix31.getFloat(data.rows[i])),
        float64field<T>('matrix[3][2]', (data, i) => data.matrix32.getFloat(data.rows[i])),
        float64field<T>('matrix[3][3]', (data, i) => data.matrix33.getFloat(data.rows[i])),
        float64field<T>('vector[3]', (data, i) => data.vector3.getFloat(data.rows[i]))
    ];

    return <CategoryInstance<T>>{
        data,
        count: rows.length,
        desc: {
            name: '_pdbx_struct_oper_list',
            fields
        }
    };
}

function _struct_asym(context: mmCifContext) {
    let data = { index: context.fragment.chainIndices, chains: context.model.chains, parent: context.model.parent };
    let fields: FieldDesc<typeof data>[] = [
        { name: 'id', string: (data, i) => data.chains.asymId[data.index[i]] },
        { name: 'pdbx_blank_PDB_chainid_flag', string: (data, i) => !data.chains.asymId[data.index[i]] ? 'Y' : 'N' },
        { name: 'pdbx_modified', string: (data, i) => 'Y' },
        { name: 'entity_id', string: (data, i) => data.chains.entityId[data.index[i]] },
        {
            name: 'details', string: (data, i) => {
                let idx = data.index[i];
                if (data.chains.sourceChainIndex && data.parent) {
                    if (data.parent.chains.asymId[data.chains.sourceChainIndex[idx]] !== data.chains.asymId[idx]) {
                        return 'Added by the Coordinate Server';
                    }
                }
                return 'Might not contain all original atoms depending on the query used'
            }
        },
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: data.index.length,
        desc: {
            name: '_struct_asym',
            fields
        }
    };
}

interface EntityPolyEntry {
    entity_id: string;
    type: string;
    nstd_linkage: string;
    nstd_monomer: string;
    pdbx_seq_one_letter_code?: string;
    pdbx_seq_one_letter_code_can?: string;
    pdbx_strand_id: string;
    strand_set: Set<string>;
    multine?: boolean;
}

function _entity_poly(context: mmCifContext) {
    let cat = context.data.getCategory('_entity_poly');
    if (!cat) return;

    let entityMap = new Map<string, EntityPolyEntry>();

    let poly: EntityPolyEntry[] = [];
    for (let i = 0; i < cat.rowCount; i++) {
        let eId = cat.getStringValue('_entity_poly.entity_id', i);

        let e = <EntityPolyEntry>{
            entity_id: eId,
            type: cat.getStringValue('_entity_poly.type', i),
            nstd_linkage: cat.getStringValue('_entity_poly.nstd_linkage', i),
            nstd_monomer: cat.getStringValue('_entity_poly.nstd_monomer', i),
            pdbx_seq_one_letter_code: cat.getStringValue('_entity_poly.pdbx_seq_one_letter_code', i),
            pdbx_seq_one_letter_code_can: cat.getStringValue('_entity_poly.pdbx_seq_one_letter_code_can', i),
            pdbx_strand_id: '',
            strand_set: new Set<string>()
        };

        entityMap.set(eId, e);
        poly.push(e);
    }


    let chains = context.model.chains;
    let residues = context.model.residues;
    let modRes = context.modifiedResidues;


    for (let chain of context.fragment.chainIndices) {
        let asymId = chains.authAsymId[chain];
        let eId = chains.entityId[chain];

        let e = entityMap.get(eId);
        if (!e || e.strand_set.has(asymId)) continue;

        if (!e.pdbx_strand_id.length) e.pdbx_strand_id = asymId;
        else e.pdbx_strand_id += ',' + asymId;

        e.strand_set.add(asymId);
    }

    poly = poly.filter(e => e.pdbx_strand_id.length > 0)
    let data = poly;
    let fields: FieldDesc<typeof data>[] = [
        { name: 'entity_id', string: (data, i) => data[i].entity_id },
        { name: 'type', string: (data, i) => data[i].type },
        { name: 'nstd_linkage', string: (data, i) => data[i].nstd_linkage },
        { name: 'nstd_monomer', string: (data, i) => data[i].nstd_monomer },
        { name: 'pdbx_seq_one_letter_code', string: (data, i) => data[i].pdbx_seq_one_letter_code },
        { name: 'pdbx_seq_one_letter_code_can', string: (data, i) => data[i].pdbx_seq_one_letter_code_can },
        { name: 'pdbx_strand_id', string: (data, i) => data[i].pdbx_strand_id }
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: poly.length,
        desc: {
            name: '_entity_poly',
            fields
        }
    };
}

function _pdbx_struct_mod_residue(context: mmCifContext) {
    let cat = context.data.getCategory('_pdbx_struct_mod_residue');
    if (!cat) return;

    let modResIndices: number[] = [], residues: number[] = [];
    let info = context.modifiedResidues;
    if (!info.map.size) return;

    let names = context.model.residues.name;

    for (let res of context.fragment.residueIndices) {
        if (!info.names.has(names[res])) continue;

        let e = info.map.get(context.getSourceResidueStringId(res));
        if (e) {
            modResIndices[modResIndices.length] = e.i;
            residues[residues.length] = res;
        }
    }

    let data = { cat, modResIndices, residues, resTable: context.model.residues };
    let fields: FieldDesc<typeof data>[] = [
        { name: 'id', string: (data, i) => (i + 1).toString() },

        { name: 'label_asym_id', string: (data, i) => data.resTable.asymId[data.residues[i]] },
        { name: 'label_seq_id', string: (data, i) => data.resTable.seqNumber[data.residues[i]].toString(), number: (data, i) => data.resTable.seqNumber[data.residues[i]], typedArray: Int32Array, encoder: Encoders.ids },
        { name: 'label_comp_id', string: (data, i) => data.resTable.name[data.residues[i]] },

        { name: 'auth_asym_id', string: (data, i) => data.resTable.authAsymId[data.residues[i]] },
        { name: 'auth_seq_id', string: (data, i) => data.resTable.authSeqNumber[data.residues[i]].toString(), number: (data, i) => data.resTable.authSeqNumber[data.residues[i]], typedArray: Int32Array, encoder: Encoders.ids },
        { name: 'auth_comp_id', string: (data, i) => data.resTable.authName[data.residues[i]] },

        { name: 'PDB_ins_code', string: (data, i) => data.resTable.insCode[data.residues[i]] },

        { name: 'parent_comp_id', string: (data, i) => data.cat.getStringValue('_pdbx_struct_mod_residue.parent_comp_id', data.modResIndices[i]) },
        { name: 'details', string: (data, i) => data.cat.getStringValue('_pdbx_struct_mod_residue.details', data.modResIndices[i]) }
    ];

    return <CategoryInstance<typeof data>>{
        data,
        count: modResIndices.length,
        desc: {
            name: '_pdbx_struct_mod_residue',
            fields
        }
    };
}

function _atom_sites(context: mmCifContext) {
    
    let cat = context.data.getCategory('_atom_sites');
    if (!cat || !cat.rowCount) return;

    let rows: number[] = [];
    for (let i = 0, _l = cat.rowCount; i < _l; i++) {
        rows[rows.length] = i;
    }

    let data = {
        rows,
        entry_id: cat.getColumn('_atom_sites.entry_id'),

        matrix11: cat.getColumn('_atom_sites.fract_transf_matrix[1][1]'),
        matrix12: cat.getColumn('_atom_sites.fract_transf_matrix[1][2]'),
        matrix13: cat.getColumn('_atom_sites.fract_transf_matrix[1][3]'),
        vector1: cat.getColumn('_atom_sites.fract_transf_vector[1]'),
        matrix21: cat.getColumn('_atom_sites.fract_transf_matrix[2][1]'),
        matrix22: cat.getColumn('_atom_sites.fract_transf_matrix[2][2]'),
        matrix23: cat.getColumn('_atom_sites.fract_transf_matrix[2][3]'),
        vector2: cat.getColumn('_atom_sites.fract_transf_vector[2]'),
        matrix31: cat.getColumn('_atom_sites.fract_transf_matrix[3][1]'),
        matrix32: cat.getColumn('_atom_sites.fract_transf_matrix[3][2]'),
        matrix33: cat.getColumn('_atom_sites.fract_transf_matrix[3][3]'),
        vector3: cat.getColumn('_atom_sites.fract_transf_vector[3]')
    };

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        { name: 'entry_id', string: (data, i) => data.entry_id.getString(data.rows[i]) },

        float64field<T>('fract_transf_matrix[1][1]', (data, i) => data.matrix11.getFloat(data.rows[i])),
        float64field<T>('fract_transf_matrix[1][2]', (data, i) => data.matrix12.getFloat(data.rows[i])),
        float64field<T>('fract_transf_matrix[1][3]', (data, i) => data.matrix13.getFloat(data.rows[i])),
        float64field<T>('fract_transf_vector[1]', (data, i) => data.vector1.getFloat(data.rows[i])),

        float64field<T>('fract_transf_matrix[2][1]', (data, i) => data.matrix21.getFloat(data.rows[i])),
        float64field<T>('fract_transf_matrix[2][2]', (data, i) => data.matrix22.getFloat(data.rows[i])),
        float64field<T>('fract_transf_matrix[2][3]', (data, i) => data.matrix23.getFloat(data.rows[i])),
        float64field<T>('fract_transf_vector[2]', (data, i) => data.vector2.getFloat(data.rows[i])),

        float64field<T>('fract_transf_matrix[3][1]', (data, i) => data.matrix31.getFloat(data.rows[i])),
        float64field<T>('fract_transf_matrix[3][2]', (data, i) => data.matrix32.getFloat(data.rows[i])),
        float64field<T>('fract_transf_matrix[3][3]', (data, i) => data.matrix33.getFloat(data.rows[i])),
        float64field<T>('fract_transf_vector[3]', (data, i) => data.vector3.getFloat(data.rows[i]))
    ];

    return <CategoryInstance<T>>{
        data,
        count: rows.length,
        desc: {
            name: '_atom_sites',
            fields
        }
    };
}

function _atom_site(context: mmCifContext) {
    
    //_atom_site.Cartn_x_esd
    //_atom_site.Cartn_y_esd
    //_atom_site.Cartn_z_esd
    //_atom_site.occupancy_esd
    //_atom_site.B_iso_or_equiv_esd
    
    //--_atom_site.pdbe_label_seq_id 

    let cat = context.data.getCategory('_atom_site');
    let data = {
        is: context.fragment.atomIndices,
        atoms: context.model.atoms,
        residues: context.model.residues,
        chains: context.model.chains,
        entities: context.model.entities,
        modelId: context.model.modelId,

        Cartn_x_esd: cat.getColumn('_atom_site.Cartn_x_esd'),
        Cartn_y_esd: cat.getColumn('_atom_site.Cartn_y_esd'),
        Cartn_z_esd: cat.getColumn('_atom_site.Cartn_z_esd'),
        occupancy_esd: cat.getColumn('_atom_site.occupancy_esd'),
        B_iso_or_equiv_esd: cat.getColumn('_atom_site.B_iso_or_equiv_esd'),

        pdbx_formal_charge: cat.getColumn('_atom_site.pdbx_formal_charge'),
    }
    
    let fields: FieldDesc<typeof data>[] = [
        { name: 'group_PDB', string: (data, i) => data.residues.isHet[data.atoms.residueIndex[data.is[i]]] ? 'HETATM' : 'ATOM' },

        { name: 'id', string: (data, i) => data.atoms.id[data.is[i]].toString(), number: (data, i) => data.atoms.id[data.is[i]], typedArray: Int32Array, encoder: Encoders.ids },

        { name: 'type_symbol', string: (data, i) => data.atoms.elementSymbol[data.is[i]] },

        { name: 'label_atom_id', string: (data, i) => data.atoms.name[data.is[i]] },
        { name: 'label_alt_id', string: (data, i) => data.atoms.altLoc[data.is[i]] },
        { name: 'label_comp_id', string: (data, i) => data.residues.name[data.atoms.residueIndex[data.is[i]]] },
        { name: 'label_asym_id', string: (data, i) => data.chains.asymId[data.atoms.chainIndex[data.is[i]]] },
        { name: 'label_entity_id', string: (data, i) => data.entities.entityId[data.atoms.entityIndex[data.is[i]]] },
        { name: 'label_seq_id', string: (data, i) => data.residues.seqNumber[data.atoms.residueIndex[data.is[i]]].toString(), number: (data, i) => data.residues.seqNumber[data.atoms.residueIndex[data.is[i]]], typedArray: Int32Array, encoder: Encoders.ids },

        { name: 'pdbx_PDB_ins_code', string: (data, i) => data.residues.insCode[data.atoms.residueIndex[data.is[i]]] },

        { name: 'Cartn_x', string: (data, i) => '' + Math.round(1000 * data.atoms.x[data.is[i]]) / 1000, number: (data, i) => Math.round(1000 * data.atoms.x[data.is[i]]) / 1000, typedArray: Float32Array, encoder: Encoders.coordinates },
        { name: 'Cartn_y', string: (data, i) => '' + Math.round(1000 * data.atoms.y[data.is[i]]) / 1000, number: (data, i) => Math.round(1000 * data.atoms.y[data.is[i]]) / 1000, typedArray: Float32Array, encoder: Encoders.coordinates },
        { name: 'Cartn_z', string: (data, i) => '' + Math.round(1000 * data.atoms.z[data.is[i]]) / 1000, number: (data, i) => Math.round(1000 * data.atoms.z[data.is[i]]) / 1000, typedArray: Float32Array, encoder: Encoders.coordinates },

        { name: 'occupancy', string: (data, i) => '' + Math.round(100 * data.atoms.occupancy[data.is[i]]) / 100, number: (data, i) => Math.round(100 * data.atoms.occupancy[data.is[i]]) / 100, typedArray: Float32Array, encoder: Encoders.occupancy },
        { name: 'B_iso_or_equiv', string: (data, i) => '' + Math.round(100 * data.atoms.tempFactor[data.is[i]]) / 100, number: (data, i) => Math.round(100 * data.atoms.tempFactor[data.is[i]]) / 100, typedArray: Float32Array, encoder: Encoders.coordinates },

        { name: 'pdbx_formal_charge', string: (data, i) => data.pdbx_formal_charge.getString(data.atoms.rowIndex[data.is[i]]) },

        { name: 'auth_atom_id', string: (data, i) => data.atoms.authName[data.is[i]] },
        { name: 'auth_comp_id', string: (data, i) => data.residues.authName[data.atoms.residueIndex[data.is[i]]] },
        { name: 'auth_asym_id', string: (data, i) => data.chains.authAsymId[data.atoms.chainIndex[data.is[i]]] },
        { name: 'auth_seq_id', string: (data, i) => data.residues.authSeqNumber[data.atoms.residueIndex[data.is[i]]].toString(), number: (data, i) => data.residues.authSeqNumber[data.atoms.residueIndex[data.is[i]]], typedArray: Int32Array, encoder: Encoders.ids },
    ];

    if (data.Cartn_x_esd && !data.Cartn_x_esd.isUndefined(data.is[0])) {
        fields.push(
            { name: 'Cartn_x_esd', string: (data, i) => data.Cartn_x_esd.getString(data.is[i]), number: (data, i) => data.Cartn_x_esd.getFloat(data.is[i]), typedArray: Float32Array, encoder: Encoders.coordinates },
            { name: 'Cartn_y_esd', string: (data, i) => data.Cartn_y_esd.getString(data.is[i]), number: (data, i) => data.Cartn_y_esd.getFloat(data.is[i]), typedArray: Float32Array, encoder: Encoders.coordinates },
            { name: 'Cartn_z_esd', string: (data, i) => data.Cartn_z_esd.getString(data.is[i]), number: (data, i) => data.Cartn_z_esd.getFloat(data.is[i]), typedArray: Float32Array, encoder: Encoders.coordinates }
        )
    }

    if (data.occupancy_esd && !data.occupancy_esd.isUndefined(data.is[0])) {
        fields.push({ name: 'occupancy_esd', string: (data, i) => data.occupancy_esd.getString(data.is[i]), number: (data, i) => data.occupancy_esd.getFloat(data.is[i]), typedArray: Float32Array, encoder: Encoders.occupancy });
    }

    if (data.B_iso_or_equiv_esd && !data.B_iso_or_equiv_esd.isUndefined(data.is[0])) {
        fields.push({ name: 'B_iso_or_equiv_esd', string: (data, i) => data.B_iso_or_equiv_esd.getString(data.is[i]), number: (data, i) => data.B_iso_or_equiv_esd.getFloat(data.is[i]), typedArray: Float32Array, encoder: Encoders.coordinates });
    }

    fields.push({ name: 'pdbx_PDB_model_num', string: (data, i) => data.modelId });

    return <CategoryInstance<typeof data>>{
        data,
        count: data.is.length,
        desc: {
            name: '_atom_site',
            fields
        }
    };
}

const Categories = {
    _entry,
    _entity,
    _cell,
    _symmetry,
    _struct_conf, 
    _struct_sheet_range,
    _chem_comp_bond,
    _pdbx_struct_assembly,
    _pdbx_struct_assembly_gen,
    _pdbx_struct_oper_list,
    _struct_asym,
    _entity_poly,
    _pdbx_struct_mod_residue,
    _atom_sites
}

export function format(writer: Writer, config: FormatConfig, models: WritableFragments[]) {
    let isEmpty = !models || !models.length || !models.some(m => m.fragments.length > 0);

    let header = createResultHeaderCategory({ isEmpty, hasError: false }, config.queryType);
    let params = createParamsCategory(config.params);

    writer.writeCategory(header);
    writer.writeCategory(params);

    let context = new mmCifContext(models[0].fragments.unionFragment(), models[0].model, config.data);
    
    for (let cat of config.includedCategories) {
        let f = (Categories as any)[cat] as CategoryProvider;
        if (!f) continue;
        writer.writeCategory(f, [context]);
    }
    let modelContexts: mmCifContext[] = [context];
    for (let i = 1; i < models.length; i++) {
        modelContexts.push(new mmCifContext(models[i].fragments.unionFragment(), models[i].model, config.data));
    }
    writer.writeCategory(_atom_site, modelContexts)
}