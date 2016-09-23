import * as Core from 'LiteMol-core'
import CIF = Core.Formats.CIF
import { Context, CategoryInstance, CategoryProvider, FieldDesc, Encoders, FormatConfig, WritableFragments, Writer, createResultHeaderCategory, createParamsCategory } from '../Context'

export interface mmCifContext extends Context {
    _residueNameSet: Set<string>,
    _modres: { map: Map<string, { i: number, original: string }>, names: Set<string> },
    lowPrecisionCoords: boolean
}

export namespace mmCifContext {
    export function isComplete(mmCtx: mmCifContext) {
        return mmCtx.model.source === Core.Structure.MoleculeModelSource.File
            ? mmCtx.fragment.atomCount === mmCtx.model.atoms.count
            : false;
    }
    
    export function residueNameSet(mmCtx: mmCifContext) {
        if (mmCtx._residueNameSet) return mmCtx._residueNameSet;

        let set = new Set<string>();
        let name = mmCtx.model.residues.name;
        for (let i of mmCtx.fragment.residueIndices) {
            set.add(name[i]);
        }
        mmCtx._residueNameSet = set;
        return set;
    }
    
    function computeModres(mmCtx: mmCifContext) {
        if (mmCtx._modres) return;


        let map = new Map<string, { i: number, original: string }>();
        let names = new Set<string>();
        mmCtx._modres = { map, names };

        let _mod_res = mmCtx.data.getCategory('_pdbx_struct_mod_residue');
        if (!_mod_res) return map;

        let label_asym_id = _mod_res.getColumn('label_asym_id');
        let label_seq_id = _mod_res.getColumn('label_seq_id');
        let PDB_ins_code = _mod_res.getColumn('PDB_ins_code');
        let parent_comp_id = _mod_res.getColumn('parent_comp_id');
        let label_comp_id = _mod_res.getColumn('label_comp_id');

        for (let i = 0; i < _mod_res.rowCount; i++) {
            let key = `${label_asym_id.getString(i)} ${label_seq_id.getString(i)} ${PDB_ins_code.getString(i)}`;
            map.set(key, { i, original: parent_comp_id.getString(i)! });
            names.add(label_comp_id.getString(i)!);
        }
    }

    export function modifiedResidues(mmCtx: mmCifContext) {
        computeModres(mmCtx);
        return mmCtx._modres;
    }

    export function getSourceResidueStringId(mmCtx: mmCifContext, i: number) {
        let res = mmCtx.model.residues, chains = mmCtx.model.chains, asymId: string;
        if (chains.sourceChainIndex) {
            let parent = mmCtx.model.parent;
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

    export function create(fragment: Core.Structure.Query.Fragment, model: Core.Structure.MoleculeModel, data: Core.Formats.CIF.DataBlock, lowPrecisionCoords: boolean): mmCifContext {
        return {
            fragment,
            model,
            data,
            lowPrecisionCoords,
            _modres: <any>void 0,
            _residueNameSet: <any>void 0
        };
    }
}

class SourceCategoryMap {
    private byKey = new Map<string, number>();
    private category: LiteMol.Core.Formats.CIF.Category | undefined = void 0;

    getString(id: string, columnName: string) {
        if (!this.category) return null;
        let row = this.byKey.get(id);
        if (row === void 0) return null;
        let col = this.category.getColumn(columnName);
        return col.getString(row);
    }

    getPresence(id: string, columnName: string) {
        if (!this.category) return CIF.ValuePresence.NotSpecified;
        let row = this.byKey.get(id);
        if (row === void 0) return CIF.ValuePresence.NotSpecified;
        let col = this.category.getColumn(columnName);
        return col.getValuePresence(row);
    }

    constructor(private context: mmCifContext, private name: string, private keyColumnName: string) {
        let cat = context.data.getCategory(name);
        if (!cat) return;
        let col = cat.getColumn(keyColumnName);
        if (!col.isDefined) return;
        this.category = cat;
        for (let i = 0; i < cat.rowCount; i++) {
            let id = col.getString(i)!;
            this.byKey.set(id, i);
        }
    }
}


export function stringColumn<T>(name: string, column: CIF.Column, row: (data: T, i: number) => number): FieldDesc<T> {
    return { name, string: (data, i) => column.getString(row(data, i)), presence: (data, i) => column.getValuePresence(row(data, i)) };
}

export function int32column<T>(name: string, column: CIF.Column, row: (data: T, i: number) => number, encoder: Core.Formats.CIF.Binary.Encoder): FieldDesc<T> {
    return { name, string: (data, i) => column.getString(row(data, i)), number: (data, i) => column.getInteger(row(data, i)), presence: (data, i) => column.getValuePresence(row(data, i)), typedArray: Int32Array, encoder };
}

export function float64field<T>(name: string, value: (data: T, i: number) => number): FieldDesc<T> {
    return { name, string: (data, i) => value(data, i).toString(), number: value, typedArray: Float64Array, encoder: Encoders.float64 };
}

export function int32field<T>(name: string, value: (data: T, i: number) => number): FieldDesc<T> {
    return { name, string: (data, i) => value(data, i).toString(), number: value, typedArray: Int32Array, encoder: Encoders.int32 };
}



function _entry(context: mmCifContext) {    
    return <CategoryInstance<string>>{
        data: context.model.id,
        count: 1,
        desc: {
            name: '_entry',
            fields: [
                { name: 'id', string: id => id, encoder: Encoders.strings, presence: () => CIF.ValuePresence.Present }
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

    let map = new SourceCategoryMap(context, '_entity', 'id');

    let data = { id: e.entityId, type: e.type, index: entityIndices, map };
    let fields: FieldDesc<typeof data>[] = [
        { name: 'id', string: (data, i) => data.id[data.index[i]] },
        { name: 'type', string: (data, i) => data.type[data.index[i]] },
        { name: 'src_method', string: (data, i) => data.map.getString(data.id[data.index[i]], 'src_method'), presence: (data, i) => data.map.getPresence(data.id[data.index[i]], 'src_method') },
        { name: 'pdbx_description', string: (data, i) => data.map.getString(data.id[data.index[i]], 'pdbx_description'), presence: (data, i) => data.map.getPresence(data.id[data.index[i]], 'pdbx_description') },
        { name: 'formula_weight', presence: () => CIF.ValuePresence.Unknown },
        { name: 'pdbx_number_of_molecules', presence: () => CIF.ValuePresence.Unknown },
        { name: 'details', presence: () => CIF.ValuePresence.NotSpecified },

        { name: 'pdbx_mutation', string: (data, i) => data.map.getString(data.id[data.index[i]], 'pdbx_mutation'), presence: (data, i) => data.map.getPresence(data.id[data.index[i]], 'pdbx_mutation') },
        { name: 'pdbx_fragment', string: (data, i) => data.map.getString(data.id[data.index[i]], 'pdbx_fragment'), presence: (data, i) => data.map.getPresence(data.id[data.index[i]], 'pdbx_fragment') },
        { name: 'pdbx_ec', string: (data, i) => data.map.getString(data.id[data.index[i]], 'pdbx_ec'), presence: (data, i) => data.map.getPresence(data.id[data.index[i]], 'pdbx_ec') }
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
        { name: 'pdbx_beg_PDB_ins_code', string: (data, i) => data.residues.insCode[data.indices.starts[i]], presence: (data, i) => data.residues.insCode[data.indices.starts[i]] ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },

        { name: 'end_label_comp_id', string: (data, i) => data.residues.name[data.indices.ends[i]] },
        { name: 'end_label_asym_id', string: (data, i) => data.residues.asymId[data.indices.ends[i]] },
        { name: 'end_label_seq_id', string: (data, i) => data.residues.seqNumber[data.indices.ends[i]].toString() },
        { name: 'pdbx_end_PDB_ins_code', string: (data, i) => data.residues.insCode[data.indices.ends[i]], presence: (data, i) => data.residues.insCode[data.indices.ends[i]] ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },

        { name: 'beg_auth_comp_id', string: (data, i) => data.residues.authName[data.indices.starts[i]] },
        { name: 'beg_auth_asym_id', string: (data, i) => data.residues.authAsymId[data.indices.starts[i]] },
        { name: 'beg_auth_seq_id', string: (data, i) => data.residues.authSeqNumber[data.indices.starts[i]].toString() },

        { name: 'end_auth_comp_id', string: (data, i) => data.residues.authName[data.indices.ends[i]] },
        { name: 'end_auth_asym_id', string: (data, i) => data.residues.authAsymId[data.indices.ends[i]] },
        { name: 'end_auth_seq_id', string: (data, i) => data.residues.authSeqNumber[data.indices.ends[i]].toString() },

        { name: 'pdbx_PDB_helix_class', string: (data, i) => { let val = data.indices.struct[data.indices.ssIndices[i]].info.helixClass; return val !== null && val !== undefined ? '' + val : '?' } },
        { name: 'details', presence: () => CIF.ValuePresence.Unknown },

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
        { name: 'pdbx_beg_PDB_ins_code', string: (data, i) => data.residues.insCode[data.indices.starts[i]], presence: (data, i) => data.residues.insCode[data.indices.starts[i]] ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },

        { name: 'end_label_comp_id', string: (data, i) => data.residues.name[data.indices.ends[i]] },
        { name: 'end_label_asym_id', string: (data, i) => data.residues.asymId[data.indices.ends[i]] },
        { name: 'end_label_seq_id', string: (data, i) => data.residues.seqNumber[data.indices.ends[i]].toString() },
        { name: 'pdbx_end_PDB_ins_code', string: (data, i) => data.residues.insCode[data.indices.ends[i]], presence: (data, i) => data.residues.insCode[data.indices.ends[i]] ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },

        { name: 'symmetry', string: (data, i) => '' + data.indices.struct[data.indices.ssIndices[i]].info.symmetry, presence: (data, i) => data.indices.struct[data.indices.ssIndices[i]].info.symmetry ? CIF.ValuePresence.Present : CIF.ValuePresence.Unknown },

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
        
    let nameCol = cat.getColumn('comp_id');
    if (!nameCol) return;
    let rows: number[] = [];
    let names = mmCifContext.residueNameSet(context);

    for (let i = 0, _l = cat.rowCount; i < _l; i++) {
        let n = nameCol.getString(i)!;
        if (names.has(n)) rows[rows.length] = i;
    }

    if (!rows.length) return;

    let data = {
        rows,
        comp_id: cat.getColumn('comp_id'),
        pdbx_stereo_config: cat.getColumn('pdbx_stereo_config'),
        pdbx_ordinal: cat.getColumn('pdbx_ordinal'),
        pdbx_aromatic_flag: cat.getColumn('pdbx_aromatic_flag'),
        atom_id_1: cat.getColumn('atom_id_1'),
        atom_id_2: cat.getColumn('atom_id_2'),
        value_order: cat.getColumn('value_order')
    };

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        stringColumn<T>('comp_id', data.comp_id, (data, i) => data.rows[i]),
        stringColumn<T>('pdbx_stereo_config', data.pdbx_stereo_config, (data, i) => data.rows[i]),
        int32column<T>('pdbx_ordinal', data.pdbx_ordinal, (data, i) => data.rows[i], Encoders.ids),
        stringColumn<T>('pdbx_aromatic_flag', data.pdbx_aromatic_flag, (data, i) => data.rows[i]),
        stringColumn<T>('atom_id_1', data.atom_id_1, (data, i) => data.rows[i]),
        stringColumn<T>('atom_id_2', data.atom_id_2, (data, i) => data.rows[i]),
        stringColumn<T>('value_order', data.value_order, (data, i) => data.rows[i])
    ];

    return <CategoryInstance<T>>{
        data,
        count: rows.length,
        desc: {
            name: '_chem_comp_bond',
            fields
        }
    };
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

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        stringColumn<T>('entry_id', data.entry_id, (data, i) => data.rows[i]),
        float64field<T>('length_a', (data, i) => data.length_a.getFloat(data.rows[i])),
        float64field<T>('length_b', (data, i) => data.length_b.getFloat(data.rows[i])),
        float64field<T>('length_c', (data, i) => data.length_c.getFloat(data.rows[i])),
        float64field<T>('angle_alpha', (data, i) => data.angle_alpha.getFloat(data.rows[i])),
        float64field<T>('angle_beta', (data, i) => data.angle_beta.getFloat(data.rows[i])),
        float64field<T>('angle_gamma', (data, i) => data.angle_gamma.getFloat(data.rows[i])),
        int32field<T>('Z_PDB', (data, i) => data.Z_PDB.getFloat(data.rows[i])),
        stringColumn<T>('pdbx_unique_axis', data.pdbx_unique_axis, (data, i) => data.rows[i])
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
        entry_id: cat.getColumn('entry_id'),
        space_group_name_HM: cat.getColumn('space_group_name_H-M'),
        pdbx_full_space_group_name_HM: cat.getColumn('pdbx_full_space_group_name_H-M'),
        cell_setting: cat.getColumn('cell_setting'),
        Int_Tables_number: cat.getColumn('Int_Tables_number'),
        space_group_name_Hall: cat.getColumn('space_group_name_Hall')
    };

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        stringColumn<T>('entry_id', data.entry_id, (data, i) => data.rows[i]),
        stringColumn<T>('space_group_name_H-M', data.space_group_name_HM, (data, i) => data.rows[i]),
        stringColumn<T>('pdbx_full_space_group_name_H-M', data.pdbx_full_space_group_name_HM, (data, i) => data.rows[i]),
        stringColumn<T>('cell_setting', data.cell_setting, (data, i) => data.rows[i]),
        stringColumn<T>('Int_Tables_number', data.Int_Tables_number, (data, i) => data.rows[i]),
        stringColumn<T>('space_group_name_Hall', data.space_group_name_Hall, (data, i) => data.rows[i])
    ];

    return <CategoryInstance<T>>{
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
        id: cat.getColumn('id'),
        details: cat.getColumn('details'),
        method_details: cat.getColumn('method_details'),
        oligomeric_details: cat.getColumn('oligomeric_details'),
        oligomeric_count: cat.getColumn('oligomeric_count')
    };

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        stringColumn<T>('id', data.id, (data, i) => data.rows[i]),
        stringColumn<T>('details', data.details, (data, i) => data.rows[i]),
        stringColumn<T>('method_details', data.method_details, (data, i) => data.rows[i]),
        stringColumn<T>('oligomeric_details', data.oligomeric_details, (data, i) => data.rows[i]),
        int32field<typeof data>('oligomeric_count', (data, i) => data.oligomeric_count.getInteger(data.rows[i]))
    ];

    return <CategoryInstance<T>>{
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
        assembly_id: cat.getColumn('assembly_id'),
        oper_expression: cat.getColumn('oper_expression'),
        asym_id_list: cat.getColumn('asym_id_list')
    };

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        stringColumn<T>('assembly_id', data.assembly_id, (data, i) => data.rows[i]),
        stringColumn<T>('oper_expression', data.oper_expression, (data, i) => data.rows[i]),
        stringColumn<T>('asym_id_list', data.asym_id_list, (data, i) => data.rows[i])
    ];

    return <CategoryInstance<T>>{
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
        id: cat.getColumn('id'),
        type: cat.getColumn('type'),
        name: cat.getColumn('name'),
        symmetry_operation: cat.getColumn('symmetry_operation'),
        matrix11: cat.getColumn('matrix[1][1]'),
        matrix12: cat.getColumn('matrix[1][2]'),
        matrix13: cat.getColumn('matrix[1][3]'),
        vector1:  cat.getColumn('vector[1]'),
        matrix21: cat.getColumn('matrix[2][1]'),
        matrix22: cat.getColumn('matrix[2][2]'),
        matrix23: cat.getColumn('matrix[2][3]'),
        vector2:  cat.getColumn('vector[2]'),
        matrix31: cat.getColumn('matrix[3][1]'),
        matrix32: cat.getColumn('matrix[3][2]'),
        matrix33: cat.getColumn('matrix[3][3]'),
        vector3:  cat.getColumn('vector[3]')
    };

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        stringColumn<T>('id', data.id, (data, i) => data.rows[i]),
        stringColumn<T>('type', data.type, (data, i) => data.rows[i]),
        stringColumn<T>('name', data.name, (data, i) => data.rows[i]),
        stringColumn<T>('symmetry_operation', data.symmetry_operation, (data, i) => data.rows[i]),
                
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
    pdbx_seq_one_letter_code: string | null;
    pdbx_seq_one_letter_code_can: string | null;
    pdbx_strand_id: string;
    strand_set: Set<string>;
    multine?: boolean;
}

function _entity_poly(context: mmCifContext) {
    let cat = context.data.getCategory('_entity_poly');
    if (!cat) return;

    let entityMap = new Map<string, EntityPolyEntry>();

    let poly: EntityPolyEntry[] = [];
    let _entity = {
        entity_id: cat.getColumn('entity_id'),
        type: cat.getColumn('type'),
        nstd_linkage: cat.getColumn('nstd_linkage'),
        nstd_monomer: cat.getColumn('nstd_monomer'),
        pdbx_seq_one_letter_code: cat.getColumn('pdbx_seq_one_letter_code'),
        pdbx_seq_one_letter_code_can: cat.getColumn('pdbx_seq_one_letter_code_can')
    }
    for (let i = 0; i < cat.rowCount; i++) {
        let eId = _entity.entity_id.getString(i)!;

        let e = <EntityPolyEntry>{
            entity_id: eId,
            type: _entity.type.getString(i),
            nstd_linkage: _entity.nstd_linkage.getString(i),
            nstd_monomer: _entity.nstd_monomer.getString(i),
            pdbx_seq_one_letter_code: _entity.pdbx_seq_one_letter_code.getString(i),
            pdbx_seq_one_letter_code_can: _entity.pdbx_seq_one_letter_code_can.getString(i),
            pdbx_strand_id: '',
            strand_set: new Set<string>()
        };

        entityMap.set(eId, e);
        poly.push(e);
    }
    
    let chains = context.model.chains;
    
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
        { name: 'type', string: (data, i) => data[i].type, presence: (data, i) => data[i].type ? CIF.ValuePresence.Present : CIF.ValuePresence.Unknown },
        { name: 'nstd_linkage', string: (data, i) => data[i].nstd_linkage, presence: (data, i) => data[i].nstd_linkage ? CIF.ValuePresence.Present : CIF.ValuePresence.Unknown },
        { name: 'nstd_monomer', string: (data, i) => data[i].nstd_monomer, presence: (data, i) => data[i].nstd_monomer ? CIF.ValuePresence.Present : CIF.ValuePresence.Unknown },
        { name: 'pdbx_seq_one_letter_code', string: (data, i) => data[i].pdbx_seq_one_letter_code, presence: (data, i) => data[i].pdbx_seq_one_letter_code ? CIF.ValuePresence.Present : CIF.ValuePresence.Unknown },
        { name: 'pdbx_seq_one_letter_code_can', string: (data, i) => data[i].pdbx_seq_one_letter_code_can, presence: (data, i) => data[i].pdbx_seq_one_letter_code_can ? CIF.ValuePresence.Present : CIF.ValuePresence.Unknown },
        { name: 'pdbx_strand_id', string: (data, i) => data[i].pdbx_strand_id, presence: (data, i) => data[i].pdbx_strand_id ? CIF.ValuePresence.Present : CIF.ValuePresence.Unknown }
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
    let info = mmCifContext.modifiedResidues(context);
    if (!info.map.size) return;

    let names = context.model.residues.name;

    for (let res of context.fragment.residueIndices) {
        if (!info.names.has(names[res])) continue;

        let e = info.map.get(mmCifContext.getSourceResidueStringId(context, res));
        if (e) {
            modResIndices[modResIndices.length] = e.i;
            residues[residues.length] = res;
        }
    }

    let data = {
        modResIndices,
        residues,
        parent_comp_id: cat.getColumn('parent_comp_id'),
        details: cat.getColumn('details'),
        resTable: context.model.residues
    };
    let fields: FieldDesc<typeof data>[] = [
        { name: 'id', string: (data, i) => (i + 1).toString() },

        { name: 'label_asym_id', string: (data, i) => data.resTable.asymId[data.residues[i]] },
        { name: 'label_seq_id', string: (data, i) => data.resTable.seqNumber[data.residues[i]].toString(), number: (data, i) => data.resTable.seqNumber[data.residues[i]], typedArray: Int32Array, encoder: Encoders.ids },
        { name: 'label_comp_id', string: (data, i) => data.resTable.name[data.residues[i]] },

        { name: 'auth_asym_id', string: (data, i) => data.resTable.authAsymId[data.residues[i]] },
        { name: 'auth_seq_id', string: (data, i) => data.resTable.authSeqNumber[data.residues[i]].toString(), number: (data, i) => data.resTable.authSeqNumber[data.residues[i]], typedArray: Int32Array, encoder: Encoders.ids },
        { name: 'auth_comp_id', string: (data, i) => data.resTable.authName[data.residues[i]] },

        { name: 'PDB_ins_code', string: (data, i) => data.resTable.insCode[data.residues[i]], presence: (data, i) => data.resTable.insCode[data.residues[i]] ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },

        { name: 'parent_comp_id', string: (data, i) => data.parent_comp_id.getString(data.modResIndices[i]), presence: (data, i) => data.parent_comp_id.getValuePresence(data.modResIndices[i]) },
        { name: 'details', string: (data, i) => data.details.getString(data.modResIndices[i]), presence: (data, i) => data.details.getValuePresence(data.modResIndices[i]) }
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

    type T = typeof data;
    let fields: FieldDesc<T>[] = [
        stringColumn<T>('entry_id', data.entry_id, (data, i) => data.rows[i]),

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
        atomIndex: context.fragment.atomIndices,
        atoms: context.model.atoms,
        residues: context.model.residues,
        chains: context.model.chains,
        entities: context.model.entities,
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
    }

    let coordinateEncoder = context.lowPrecisionCoords ? Encoders.coordinates1 : Encoders.coordinates3;
    
    let fields: FieldDesc<typeof data>[] = [
        { name: 'group_PDB', string: (data, i) => data.residues.isHet[data.atoms.residueIndex[data.atomIndex[i]]] ? 'HETATM' : 'ATOM' },

        { name: 'id', string: (data, i) => data.atoms.id[data.atomIndex[i]].toString(), number: (data, i) => data.atoms.id[data.atomIndex[i]], typedArray: Int32Array, encoder: Encoders.ids },

        { name: 'type_symbol', string: (data, i) => data.atoms.elementSymbol[data.atomIndex[i]] },

        { name: 'label_atom_id', string: (data, i) => data.atoms.name[data.atomIndex[i]] },
        { name: 'label_alt_id', string: (data, i) => data.atoms.altLoc[data.atomIndex[i]], presence: (data, i) => data.atoms.altLoc[data.atomIndex[i]] ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },
        { name: 'label_comp_id', string: (data, i) => data.residues.name[data.atoms.residueIndex[data.atomIndex[i]]] },
        { name: 'label_asym_id', string: (data, i) => data.chains.asymId[data.atoms.chainIndex[data.atomIndex[i]]] },
        { name: 'label_entity_id', string: (data, i) => data.entities.entityId[data.atoms.entityIndex[data.atomIndex[i]]] },
        { name: 'label_seq_id', string: (data, i) => data.residues.seqNumber[data.atoms.residueIndex[data.atomIndex[i]]].toString(), number: (data, i) => data.residues.seqNumber[data.atoms.residueIndex[data.atomIndex[i]]], typedArray: Int32Array, encoder: Encoders.ids, presence: (data, i) => data.label_seq_id.getValuePresence(data.atomIndex[i]) },

        { name: 'pdbx_PDB_ins_code', string: (data, i) => data.residues.insCode[data.atoms.residueIndex[data.atomIndex[i]]], presence: (data, i) => data.residues.insCode[data.atoms.residueIndex[data.atomIndex[i]]] ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },

        { name: 'Cartn_x', string: (data, i) => '' + Math.round(data.coordRoundFactor * data.atoms.x[data.atomIndex[i]]) / data.coordRoundFactor, number: (data, i) => data.atoms.x[data.atomIndex[i]], typedArray: Float32Array, encoder: coordinateEncoder },
        { name: 'Cartn_y', string: (data, i) => '' + Math.round(data.coordRoundFactor * data.atoms.y[data.atomIndex[i]]) / data.coordRoundFactor, number: (data, i) => data.atoms.y[data.atomIndex[i]], typedArray: Float32Array, encoder: coordinateEncoder },
        { name: 'Cartn_z', string: (data, i) => '' + Math.round(data.coordRoundFactor * data.atoms.z[data.atomIndex[i]]) / data.coordRoundFactor, number: (data, i) => data.atoms.z[data.atomIndex[i]], typedArray: Float32Array, encoder: coordinateEncoder },

        { name: 'occupancy', string: (data, i) => '' + Math.round(100 * data.atoms.occupancy[data.atomIndex[i]]) / 100, number: (data, i) => data.atoms.occupancy[data.atomIndex[i]], typedArray: Float32Array, encoder: Encoders.occupancy },
        { name: 'B_iso_or_equiv', string: (data, i) => '' + Math.round(data.bRoundFactor * data.atoms.tempFactor[data.atomIndex[i]]) / data.bRoundFactor, number: (data, i) => data.atoms.tempFactor[data.atomIndex[i]], typedArray: Float32Array, encoder: coordinateEncoder },

        { name: 'pdbx_formal_charge', string: (data, i) => data.pdbx_formal_charge.getString(data.atoms.rowIndex[data.atomIndex[i]]), presence: (data, i) => data.pdbx_formal_charge.getValuePresence(data.atoms.rowIndex[data.atomIndex[i]]) },

        { name: 'auth_atom_id', string: (data, i) => data.atoms.authName[data.atomIndex[i]] },
        { name: 'auth_comp_id', string: (data, i) => data.residues.authName[data.atoms.residueIndex[data.atomIndex[i]]] },
        { name: 'auth_asym_id', string: (data, i) => data.chains.authAsymId[data.atoms.chainIndex[data.atomIndex[i]]] },
        { name: 'auth_seq_id', string: (data, i) => data.residues.authSeqNumber[data.atoms.residueIndex[data.atomIndex[i]]].toString(), number: (data, i) => data.residues.authSeqNumber[data.atoms.residueIndex[data.atomIndex[i]]], typedArray: Int32Array, encoder: Encoders.ids },
    ];

    if (data.Cartn_x_esd && data.Cartn_x_esd.getValuePresence(data.atomIndex[0]) === CIF.ValuePresence.Present) {
        fields.push(
            { name: 'Cartn_x_esd', string: (data, i) => data.Cartn_x_esd.getString(data.atomIndex[i]), number: (data, i) => data.Cartn_x_esd.getFloat(data.atomIndex[i]), typedArray: Float32Array, encoder: coordinateEncoder },
            { name: 'Cartn_y_esd', string: (data, i) => data.Cartn_y_esd.getString(data.atomIndex[i]), number: (data, i) => data.Cartn_y_esd.getFloat(data.atomIndex[i]), typedArray: Float32Array, encoder: coordinateEncoder },
            { name: 'Cartn_z_esd', string: (data, i) => data.Cartn_z_esd.getString(data.atomIndex[i]), number: (data, i) => data.Cartn_z_esd.getFloat(data.atomIndex[i]), typedArray: Float32Array, encoder: coordinateEncoder }
        )
    }

    if (data.occupancy_esd && data.occupancy_esd.getValuePresence(data.atomIndex[0]) === CIF.ValuePresence.Present) {
        fields.push({ name: 'occupancy_esd', string: (data, i) => data.occupancy_esd.getString(data.atomIndex[i]), number: (data, i) => data.occupancy_esd.getFloat(data.atomIndex[i]), typedArray: Float32Array, encoder: Encoders.occupancy });
    }

    if (data.B_iso_or_equiv_esd && data.B_iso_or_equiv_esd.getValuePresence(data.atomIndex[0]) === CIF.ValuePresence.Present) {
        fields.push({ name: 'B_iso_or_equiv_esd', string: (data, i) => data.B_iso_or_equiv_esd.getString(data.atomIndex[i]), number: (data, i) => data.B_iso_or_equiv_esd.getFloat(data.atomIndex[i]), typedArray: Float32Array, encoder: coordinateEncoder });
    }

    fields.push({ name: 'pdbx_PDB_model_num', string: (data, i) => data.modelId });

    return <CategoryInstance<typeof data>>{
        data,
        count: data.atomIndex.length,
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

    let context = mmCifContext.create(models[0].fragments.unionFragment(), models[0].model, config.data, config.params.common.lowPrecisionCoords);

    if (!config.params.common.atomSitesOnly) {
        for (let cat of config.includedCategories) {
            let f = (Categories as any)[cat] as CategoryProvider;
            if (!f) continue;
            writer.writeCategory(f, [context]);
        }
    }
    let modelContexts: mmCifContext[] = [context];
    for (let i = 1; i < models.length; i++) {
        modelContexts.push(mmCifContext.create(models[i].fragments.unionFragment(), models[i].model, config.data, config.params.common.lowPrecisionCoords));
    }
    writer.writeCategory(_atom_site, modelContexts)
}