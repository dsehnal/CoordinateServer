
import * as Core from 'LiteMol-core'
import CifStringWriter from './CifStringWriter'
import StringWriter from './StringWriter'

namespace CifCategoryWriters {

    export type CifCategoryWriter = (content: CifWriterContents, writer: CifStringWriter) => void;
    export type FieldDesc<T> = { name: string, src: (ctx: T, i: number) => string }[];

    export class CifWriterContents {

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

        constructor(public fragment: Core.Structure.Queries.Fragment, public model: Core.Structure.MoleculeModel, public data: Core.Formats.Cif.Block) {
        }
    }

    function isMultiline(value: string) {
        return !!value && value.indexOf('\n') >= 0;
    }

    function writeSingleRecord<T>(fields: FieldDesc<T>, ctx: T, writer: CifStringWriter) {
        let width = fields.reduce((w, s) => Math.max(w, s.name.length), 0) + 5;

        for (let f of fields) {
            writer.writer.writePadRight(f.name, width);
            let val = f.src(ctx, 0);
            if (isMultiline(val)) {
                writer.writeMultiline(val);
                writer.writer.newline();
            } else {
                writer.writeChecked(val);
            }
            writer.writer.newline();
        }

    }

    function writeLoopRecords<T>(fields: FieldDesc<T>, ctx: T, count: number, writer: CifStringWriter) {
        writer.writeLine('loop_');
        for (let f of fields) {
            writer.writeLine(f.name);
        }
        for (let i = 0; i < count; i++) {
            for (let f of fields) {
                let val = f.src(ctx, i);
                if (isMultiline(val)) {
                    writer.writeMultiline(val);
                    writer.writer.newline();
                } else {
                    writer.writeChecked(val);
                }
            }
            writer.newline();
        }
    }

    export function writeRecords<T>(fields: FieldDesc<T>, ctx: T, count: number, writer: CifStringWriter) {
        if (count === 0) return;
        else if (count === 1) {
            writeSingleRecord(fields, ctx, writer);
        } else {
            writeLoopRecords(fields, ctx, count, writer);
        }
    }

    function copyCategory(name: string, content: CifWriterContents, writer: CifStringWriter) {
        let cat = content.data.getCategory(name);
        if (!cat) return;
        writer.write(content.data.data.substring(cat.startIndex, cat.endIndex));
    }

    function writeCopyCategory(name: string) {
        return function (content: CifWriterContents, writer: CifStringWriter) {
            copyCategory(name, content, writer);
        }
    }

    function writeEntry(content: CifWriterContents, writer: CifStringWriter) {
        writer.write('_entry.id     ');
        writer.writeChecked(content.model.id);
        writer.write('\n#\n');
    }

    function writeEntity(content: CifWriterContents, writer: CifStringWriter) {
        if (content.isComplete) {
            copyCategory('_entity', content, writer);
            return;
        }

        let f = content.fragment;
        if (!f.entityIndices.length) return;

        let e = content.model.entities;

        let ctx = { id: e.entityId, type: e.type, index: f.entityIndices };
        let fields: FieldDesc<typeof ctx> = [
            { name: '_entity.id', src: (ctx, i) => ctx.id[ctx.index[i]] },
            { name: '_entity.type', src: (ctx, i) => ctx.type[ctx.index[i]] },
            { name: '_entity.src_method', src: (ctx, i) => '?' },
            { name: '_entity.pdbx_description', src: (ctx, i) => '?' },
            { name: '_entity.formula_weight', src: (ctx, i) => '?' },
            { name: '_entity.pdbx_number_of_molecules', src: (ctx, i) => '?' },
            { name: '_entity.details', src: (ctx, i) => 'Generated to provide info about entity type' },
            { name: '_entity.pdbx_mutation', src: (ctx, i) => '?' },
            { name: '_entity.pdbx_fragment', src: (ctx, i) => '?' },
            { name: '_entity.pdbx_ec', src: (ctx, i) => '?' }
        ];

        writeRecords(fields, ctx, f.entityIndices.length, writer);

        writer.write('#\n');
    }

    function writeChemCompBond(content: CifWriterContents, writer: CifStringWriter) {
        let cat = content.data.getCategory('_chem_comp_bond');
        if (!cat) return;

        let cols = cat.columnArray;
        let nameCol = cat.getColumn('_chem_comp_bond.comp_id');
        if (!nameCol) return;
        let rows: number[] = [];
        let names = content.residueNameSet;

        for (let i = 0, _l = cat.rowCount; i < _l; i++) {
            let n = nameCol.getString(i);
            if (names.has(n)) rows[rows.length] = i;
        }

        if (!rows.length) return;

        writer.writeLine('loop_');
        for (let c of cols) {
            writer.writeLine(c.name);
        }

        for (let r of rows) {
            for (let c of cols) {
                writer.writeChecked(c.getString(r));
            }
            writer.newline();
        }

        writer.write('#\n');
    }

    function findSecondary(test: (t: Core.Structure.SecondaryStructureType) => boolean, content: CifWriterContents) {
        if (!content.model.secondaryStructure) return;

        let starts: number[] = [], ends: number[] = [], lengths: number[] = [],
            ssIndices: number[] = [];

        let struct = content.model.secondaryStructure.filter(s => test(s.type));

        if (!struct.length) return;

        let currentStructure = 0, currentStart = struct[0].startResidueIndex, currentEnd = struct[0].endResidueIndex;

        let residues = content.fragment.residueIndices;

        for (let k = 0, length = residues.length; k < length;) {

            let residueIndex = residues[k];
            if (residueIndex >= currentStart && residueIndex < currentEnd) {
                //console.log(`start, ${residueIndex}, ${currentStart}, ${currentEnd}`);
                let start = residueIndex;
                let slen = 0;

                while (k < length && currentEnd > residues[k]) {
                    k++;
                    slen++;
                }

                ////if (currentStructure > 0) {
                ////    if (sStruct[currentStructure - 1].endResidueIndex === currentStart) {
                ////        residueIndex--;
                ////        if (residueIndex < 0) residueIndex = 0;
                ////        slen++;
                ////    }
                ////}

                k--;
                starts[starts.length] = residueIndex;
                ends[ends.length] = residues[k];
                lengths[lengths.length] = slen;
                ssIndices[ssIndices.length] = currentStructure;

                //if (starts.length >= 3) break;

                //console.log(currentStructure);
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

    function writeHelices(content: CifWriterContents, writer: CifStringWriter) {

        //if (content.model.source === Core.Structure.MoleculeModelSource.Computed) return;

        let helix = Core.Structure.SecondaryStructureType.Helix, turn = Core.Structure.SecondaryStructureType.Turn;

        let ssIndices = findSecondary(t => t === helix || t === turn, content);
        if (!ssIndices || !ssIndices.starts.length) return;

        let rs = content.model.residues;
        let ctx = { indices: ssIndices, residues: rs, index: content.fragment.residueIndices, helixCounter: 0, turnCounter: 0, helix, turn };
        let fields: FieldDesc<typeof ctx> = [
            { name: '_struct_conf.conf_type_id', src: (ctx, i) => ctx.indices.struct[ctx.indices.ssIndices[i]].type === ctx.helix ? 'HELX_P' : 'TURN_P' },
            { name: '_struct_conf.id', src: (ctx, i) => ctx.indices.struct[ctx.indices.ssIndices[i]].type === ctx.helix ? 'HELX_P' + (++ctx.helixCounter) : 'TURN_P' + (++ctx.turnCounter) },
            { name: '_struct_conf.pdbx_PDB_helix_id', src: (ctx, i) => (i + 1).toString() },

            { name: '_struct_conf.beg_label_comp_id', src: (ctx, i) => ctx.residues.name[ctx.indices.starts[i]] },
            { name: '_struct_conf.beg_label_asym_id', src: (ctx, i) => ctx.residues.asymId[ctx.indices.starts[i]] },
            { name: '_struct_conf.beg_label_seq_id', src: (ctx, i) => ctx.residues.seqNumber[ctx.indices.starts[i]].toString() },
            { name: '_struct_conf.pdbx_beg_PDB_ins_code', src: (ctx, i) => ctx.residues.insCode[ctx.indices.starts[i]] },

            { name: '_struct_conf.end_label_comp_id', src: (ctx, i) => ctx.residues.name[ctx.indices.ends[i]] },
            { name: '_struct_conf.end_label_asym_id', src: (ctx, i) => ctx.residues.asymId[ctx.indices.ends[i]] },
            { name: '_struct_conf.end_label_seq_id', src: (ctx, i) => ctx.residues.seqNumber[ctx.indices.ends[i]].toString() },
            { name: '_struct_conf.pdbx_end_PDB_ins_code', src: (ctx, i) => ctx.residues.insCode[ctx.indices.ends[i]] },

            { name: '_struct_conf.beg_auth_comp_id', src: (ctx, i) => ctx.residues.authName[ctx.indices.starts[i]] },
            { name: '_struct_conf.beg_auth_asym_id', src: (ctx, i) => ctx.residues.authAsymId[ctx.indices.starts[i]] },
            { name: '_struct_conf.beg_auth_seq_id', src: (ctx, i) => ctx.residues.authSeqNumber[ctx.indices.starts[i]].toString() },

            { name: '_struct_conf.end_auth_comp_id', src: (ctx, i) => ctx.residues.authName[ctx.indices.ends[i]] },
            { name: '_struct_conf.end_auth_asym_id', src: (ctx, i) => ctx.residues.authAsymId[ctx.indices.ends[i]] },
            { name: '_struct_conf.end_auth_seq_id', src: (ctx, i) => ctx.residues.authSeqNumber[ctx.indices.ends[i]].toString() },

            { name: '_struct_conf.pdbx_PDB_helix_class', src: (ctx, i) => { let val = ctx.indices.struct[ctx.indices.ssIndices[i]].info.helixClass; return val !== null && val !== undefined ? '' + val : '?' } },
            { name: '_struct_conf.details', src: (ctx, i) => '?' },

            { name: '_struct_conf.pdbx_PDB_helix_length', src: (ctx, i) => ctx.indices.lengths[i].toString() }
        ];

        writeRecords(fields, ctx, ssIndices.starts.length, writer);

        writer.write('#\n');
    }

    function writeSheets(content: CifWriterContents, writer: CifStringWriter) {

        //if (content.model.source === Core.Structure.MoleculeModelSource.Computed) return;

        let sheet = Core.Structure.SecondaryStructureType.Sheet;
        let ssIndices = findSecondary(t => t === sheet, content);
        if (!ssIndices || !ssIndices.starts.length) return;

        let rs = content.model.residues;
        let ctx = { indices: ssIndices, residues: rs, index: content.fragment.residueIndices };
        let fields: FieldDesc<typeof ctx> = [
            { name: '_struct_sheet_range.conf_type_id', src: (ctx, i) => { let val = ctx.indices.struct[ctx.indices.ssIndices[i]].info.sheetId; return val !== null && val !== undefined ? '' + val : (i + 1).toString() } },
            { name: '_struct_sheet_range.id', src: (ctx, i) => { let val = ctx.indices.struct[ctx.indices.ssIndices[i]].info.id; return val !== null && val !== undefined ? '' + val : (i + 1).toString() } },

            { name: '_struct_sheet_range.beg_label_comp_id', src: (ctx, i) => ctx.residues.name[ctx.indices.starts[i]] },
            { name: '_struct_sheet_range.beg_label_asym_id', src: (ctx, i) => ctx.residues.asymId[ctx.indices.starts[i]] },
            { name: '_struct_sheet_range.beg_label_seq_id', src: (ctx, i) => ctx.residues.seqNumber[ctx.indices.starts[i]].toString() },
            { name: '_struct_sheet_range.pdbx_beg_PDB_ins_code', src: (ctx, i) => ctx.residues.insCode[ctx.indices.starts[i]] },

            { name: '_struct_sheet_range.end_label_comp_id', src: (ctx, i) => ctx.residues.name[ctx.indices.ends[i]] },
            { name: '_struct_sheet_range.end_label_asym_id', src: (ctx, i) => ctx.residues.asymId[ctx.indices.ends[i]] },
            { name: '_struct_sheet_range.end_label_seq_id', src: (ctx, i) => ctx.residues.seqNumber[ctx.indices.ends[i]].toString() },
            { name: '_struct_sheet_range.pdbx_end_PDB_ins_code', src: (ctx, i) => ctx.residues.insCode[ctx.indices.ends[i]] },

            { name: '_struct_sheet_range.symmetry', src: (ctx, i) => { let val = ctx.indices.struct[ctx.indices.ssIndices[i]].info.symmetry; return val !== null && val !== undefined ? '' + val : '?' } },

            { name: '_struct_sheet_range.beg_auth_comp_id', src: (ctx, i) => ctx.residues.authName[ctx.indices.starts[i]] },
            { name: '_struct_sheet_range.beg_auth_asym_id', src: (ctx, i) => ctx.residues.authAsymId[ctx.indices.starts[i]] },
            { name: '_struct_sheet_range.beg_auth_seq_id', src: (ctx, i) => ctx.residues.authSeqNumber[ctx.indices.starts[i]].toString() },

            { name: '_struct_sheet_range.end_auth_comp_id', src: (ctx, i) => ctx.residues.authName[ctx.indices.ends[i]] },
            { name: '_struct_sheet_range.end_auth_asym_id', src: (ctx, i) => ctx.residues.authAsymId[ctx.indices.ends[i]] },
            { name: '_struct_sheet_range.end_auth_seq_id', src: (ctx, i) => ctx.residues.authSeqNumber[ctx.indices.ends[i]].toString() },
        ];

        writeRecords(fields, ctx, ssIndices.starts.length, writer);

        writer.write('#\n');
    }

    ////var shortResidueNames: { [name: string]: string } = {
    ////    'ALA': 'A',
    ////    'ARG': 'R',
    ////    'ASN': 'N',
    ////    'ASP': 'D',
    ////    'CYS': 'C',
    ////    'GLN': 'Q',
    ////    'GLU': 'E',
    ////    'GLY': 'G',
    ////    'HIS': 'H',
    ////    'ILE': 'I',
    ////    'LEU': 'L',
    ////    'LYS': 'K',
    ////    'MET': 'M',
    ////    'PHE': 'F',
    ////    'PRO': 'P',
    ////    'SER': 'S',
    ////    'THR': 'T',
    ////    'TRP': 'W',
    ////    'TYR': 'Y',
    ////    'VAL': 'V',

    ////    'A': 'A',
    ////    'C': 'C',
    ////    'G': 'G',
    ////    'T': 'T',
    ////    'U': 'U',
    ////    'DA': 'A',
    ////    'DC': 'C',
    ////    'DG': 'G',
    ////    'DT': 'T',
    ////    'DU': 'U',
    ////}
    
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

    function writeEntityPoly(content: CifWriterContents, writer: CifStringWriter) {

        let _entity_poly = content.data.getCategory('_entity_poly');
        if (!_entity_poly) return;

        let entityMap = new Map<string, EntityPolyEntry>();

        //let repl = /[ \t\n\r]/g;
        let poly: EntityPolyEntry[] = [];
        for (let i = 0; i < _entity_poly.rowCount; i++) {

            let eId = _entity_poly.getStringValue('_entity_poly.entity_id', i);
            //let strand = _entity_poly.getStringValue('_entity_poly.pdbx_strand_id', i);
            //let id = `${eId} ${strand}`;

            let e = <EntityPolyEntry>{
                entity_id: eId,
                type: _entity_poly.getStringValue('_entity_poly.type', i),
                nstd_linkage: _entity_poly.getStringValue('_entity_poly.nstd_linkage', i),
                nstd_monomer: _entity_poly.getStringValue('_entity_poly.nstd_monomer', i),
                pdbx_seq_one_letter_code: _entity_poly.getStringValue('_entity_poly.pdbx_seq_one_letter_code', i), //.replace(repl, ''),
                pdbx_seq_one_letter_code_can: _entity_poly.getStringValue('_entity_poly.pdbx_seq_one_letter_code_can', i), //.replace(repl, ''),
                pdbx_strand_id: '', //_entity_poly.getStringValue('_entity_poly.pdbx_strand_id', i)
                strand_set: new Set<string>()
            };

            entityMap.set(eId, e);
            poly.push(e);
        }
        

        let chains = content.model.chains;
        let residues = content.model.residues;
        let modRes = content.modifiedResidues;
        
        
        for (let chain of content.fragment.chainIndices) {
            let asymId = chains.authAsymId[chain];
            let eId = chains.entityId[chain];

            let e = entityMap.get(eId);
            if (!e || e.strand_set.has(asymId)) continue;
            
            if (!e.pdbx_strand_id.length) e.pdbx_strand_id = asymId;
            else e.pdbx_strand_id += ',' + asymId;

            e.strand_set.add(asymId);

            //let parentAsymId = asymId;
            //if (chains.sourceChainIndex && content.model.parent) parentAsymId = content.model.parent.chains.authAsymId[chains.sourceChainIndex[chain]];

            ////let info = entityMap.get(`${eId} ${parentAsymId}`);

            ////if (!info /* || content.model.entities.entityType[chains.entityIndex[chain]] !== Core.Structure.EntityType.Polymer */) {
            ////    continue;
            ////}
            
            ////let len = 0, len_can = 0;
            ////let seq = new StringWriter(); 
            ////let seq_can = new StringWriter(); 

            ////for (let res of content.fragment.residueIndices) {
            ////    if (residues.chainIndex[res] !== chain) continue;

            ////    let name = residues.name[res];


            ////    if (modRes.names.has(name)) {
            ////        let e = modRes.map.get(content.getSourceResidueStringId(res));
            ////        if (e) name = e.original;
            ////    }

            ////    let shortName = shortResidueNames[name];

            ////    if (shortName) {
            ////        seq.write(shortName);
            ////        len++;
            ////        seq_can.write(shortName);
            ////        len_can++;
            ////    } else {
            ////        seq_can.write(name === 'HOH' || name === 'SOL' || name === 'WTR' ? 'O' : 'X');
            ////        len_can++;
            ////    }
                
            ////    if (len > 0 && len % 80 === 0) seq.newline();
            ////    if (len_can > 0 && len_can % 80 === 0) seq_can.newline();
            ////}

            ////if (len > 0 || len_can > 0) {
            ////    poly.push({
            ////        entity_id: eId,
            ////        type: info ? info.type : '?',
            ////        nstd_linkage: info ? info.nstd_linkage : '?',
            ////        nstd_monomer: info ? info.nstd_monomer : '?',
            ////        pdbx_seq_one_letter_code: seq.asString(),
            ////        pdbx_seq_one_letter_code_can: seq_can.asString(),
            ////        pdbx_strand_id: asymId
            ////    });
            ////}
        }

        poly = poly.filter(e => e.pdbx_strand_id.length > 0)
        let ctx = poly;
        let fields: FieldDesc<typeof ctx> = [
            { name: '_entity_poly.entity_id', src: (ctx, i) => ctx[i].entity_id },
            { name: '_entity_poly.type', src: (ctx, i) => ctx[i].type },
            { name: '_entity_poly.nstd_linkage', src: (ctx, i) => ctx[i].nstd_linkage },
            { name: '_entity_poly.nstd_monomer', src: (ctx, i) => ctx[i].nstd_monomer },
            { name: '_entity_poly.pdbx_seq_one_letter_code', src: (ctx, i) => ctx[i].pdbx_seq_one_letter_code },
            { name: '_entity_poly.pdbx_seq_one_letter_code_can', src: (ctx, i) => ctx[i].pdbx_seq_one_letter_code_can },
            { name: '_entity_poly.pdbx_strand_id', src: (ctx, i) => ctx[i].pdbx_strand_id }
        ];

        writeRecords(fields, ctx, poly.length, writer);

        writer.write('#\n');
    }

    function writeModRes(content: CifWriterContents, writer: CifStringWriter) {
        let _mod_res = content.data.getCategory('_pdbx_struct_mod_residue');
        if (!_mod_res) return;

        let modResIndices: number[] = [], residues: number[] = [];
        let info = content.modifiedResidues;
        if (!info.map.size) return;

        let names = content.model.residues.name;

        for (let res of content.fragment.residueIndices) {
            if (!info.names.has(names[res])) continue;

            let e = info.map.get(content.getSourceResidueStringId(res));
            if (e) {
                modResIndices[modResIndices.length] = e.i;
                residues[residues.length] = res;
            }
        }

        let ctx = { _mod_res, modResIndices, residues, resTable: content.model.residues };
        let fields: FieldDesc<typeof ctx> = [
            { name: '_pdbx_struct_mod_residue.id', src: (ctx, i) => (i + 1).toString() },

            { name: '_pdbx_struct_mod_residue.label_asym_id', src: (ctx, i) => ctx.resTable.asymId[ctx.residues[i]] },
            { name: '_pdbx_struct_mod_residue.label_seq_id', src: (ctx, i) => ctx.resTable.seqNumber[ctx.residues[i]].toString() },
            { name: '_pdbx_struct_mod_residue.label_comp_id', src: (ctx, i) => ctx.resTable.name[ctx.residues[i]] },

            { name: '_pdbx_struct_mod_residue.auth_asym_id', src: (ctx, i) => ctx.resTable.authAsymId[ctx.residues[i]] },
            { name: '_pdbx_struct_mod_residue.auth_seq_id', src: (ctx, i) => ctx.resTable.authSeqNumber[ctx.residues[i]].toString() },
            { name: '_pdbx_struct_mod_residue.auth_comp_id', src: (ctx, i) => ctx.resTable.authName[ctx.residues[i]] },

            { name: '_pdbx_struct_mod_residue.PDB_ins_code', src: (ctx, i) => ctx.resTable.insCode[ctx.residues[i]] },

            { name: '_pdbx_struct_mod_residue.parent_comp_id', src: (ctx, i) => ctx._mod_res.getStringValue('_pdbx_struct_mod_residue.parent_comp_id', ctx.modResIndices[i]) },
            { name: '_pdbx_struct_mod_residue.details', src: (ctx, i) => ctx._mod_res.getStringValue('_pdbx_struct_mod_residue.details', ctx.modResIndices[i]) }
        ];

        writeRecords(fields, ctx, modResIndices.length, writer);

        writer.write('#\n');
    }

    function writeStructAsym(content: CifWriterContents, writer: CifStringWriter) {

        let ctx = { index: content.fragment.chainIndices, chains: content.model.chains, parent: content.model.parent };
        let fields: FieldDesc<typeof ctx> = [
            { name: '_struct_asym.id', src: (ctx, i) => ctx.chains.asymId[ctx.index[i]] },
            { name: '_struct_asym.pdbx_blank_PDB_chainid_flag', src: (ctx, i) => !ctx.chains.asymId[ctx.index[i]] ? 'Y' : 'N' },
            { name: '_struct_asym.pdbx_modified', src: (ctx, i) => 'Y' },
            { name: '_struct_asym.entity_id', src: (ctx, i) => ctx.chains.entityId[ctx.index[i]] },
            {
                name: '_struct_asym.details', src: (ctx, i) => {
                    let idx = ctx.index[i];
                    if (ctx.chains.sourceChainIndex && ctx.parent) {

                        if (ctx.parent.chains.asymId[ctx.chains.sourceChainIndex[idx]] !== ctx.chains.asymId[idx]) {
                            return 'Added by the Coordinate Server';
                        }
                    }
                    return 'Might not contain all original atoms depending on the query used' 
                }
            },
        ];

        writeRecords(fields, ctx, content.fragment.chainIndices.length, writer);

        writer.write('#\n');
    }
    
    export var CategoryWriters: { [cat: string]: CifCategoryWriter } = {
        '_entry': writeEntry,
        '_entity': writeEntity,
        '_pdbx_struct_assembly': writeCopyCategory('_pdbx_struct_assembly'),
        '_pdbx_struct_assembly_gen': writeCopyCategory('_pdbx_struct_assembly_gen'),
        '_pdbx_struct_oper_list': writeCopyCategory('_pdbx_struct_oper_list'),
        '_cell': writeCopyCategory('_cell'),
        '_symmetry': writeCopyCategory('_symmetry'),
        '_atom_sites': writeCopyCategory('_atom_sites'),
        '_chem_comp_bond': writeChemCompBond,
        '_struct_conf': writeHelices,
        '_struct_sheet_range': writeSheets,
        '_pdbx_struct_mod_residue': writeModRes,
        '_struct_asym': writeStructAsym,
        '_entity_poly': writeEntityPoly
    };


    class AtomSiteCellModelStringWriter {
        write(aI: number, offset: number) { this.w.writeChecked(this.col[aI]); }
        constructor(private w: CifStringWriter, private col: any[]) { }
    }

    class AtomSiteCellModelIndirectWriter {
        write(aI: number, offset: number) { this.w.writeChecked(this.colB[this.colA[aI]]); }
        constructor(private w: CifStringWriter, private colA: any[], private colB: any[]) { }
    }

    class AtomSiteCellModelIntegerWriter {
        write(aI: number, offset: number) { this.w.writeInteger(this.col[aI]); }
        constructor(private w: CifStringWriter, private col: any[]) { }
    }

    class AtomSiteCellModelFloatWriter {
        write(aI: number, offset: number) { this.w.writeFloat(this.col[aI], this.prec); }
        constructor(private w: CifStringWriter, private col: any[], private prec: number) { }
    }

    class AtomSiteCellTokenWriter {
        write(aI: number, offset: number) {
            let o = offset + this.i;
            this.w.writeChecked(this.data.substring(this.tokens[2 * o], this.tokens[2 * o + 1]));
        }
        constructor(private w: CifStringWriter, private i: number, private data: string, private tokens: number[]) { }
    }

    function copyAtomSites(data: Core.Formats.Cif.Block, model: Core.Structure.MoleculeModel, atoms: number[], writer: CifStringWriter) {
        
        let atomsCat = data.getCategory('_atom_site'),
            tokens = atomsCat.tokens,
            cols = atomsCat.columnNames,
            source = data.data,
            colCount = cols.length;
        
        let rowIndex = model.atoms.rowIndex;

        for (let ai of atoms) {

            writer.write('\n');
            let offset = rowIndex[ai] * colCount;
            for (let i = 0; i < colCount; i++) {
                writer.writeChecked(source.substring(tokens[2 * (offset + i)], tokens[2 * (offset + i) + 1]));
            }
        }
    }

    function writeAtomSitesProper(data: Core.Formats.Cif.Block, model: Core.Structure.MoleculeModel, atoms: number[], writer: CifStringWriter) {

        let atomsCat = data.getCategory('_atom_site'),
            tokens = atomsCat.tokens,
            cols = atomsCat.columnNames,
            source = data.data,
            colCount = cols.length;
        
        let rowIndex = model.atoms.rowIndex;
        
        let writers = cols.map((c: string, i: number) => {
            switch (c) {
                case '_atom_site.id': return <any>new AtomSiteCellModelIntegerWriter(writer, model.atoms.id);
                case '_atom_site.Cartn_x': return <any>new AtomSiteCellModelFloatWriter(writer, model.atoms.x, 1000);
                case '_atom_site.Cartn_y': return <any>new AtomSiteCellModelFloatWriter(writer, model.atoms.y, 1000);
                case '_atom_site.Cartn_z': return <any>new AtomSiteCellModelFloatWriter(writer, model.atoms.z, 1000);
                case '_atom_site.label_asym_id': return <any>new AtomSiteCellModelIndirectWriter(writer, model.atoms.residueIndex, model.residues.asymId);
                case '_atom_site.auth_asym_id': return <any>new AtomSiteCellModelIndirectWriter(writer, model.atoms.residueIndex, model.residues.authAsymId);
                default: return <any>new AtomSiteCellTokenWriter(writer, i, source, tokens);
            }
        });

        for (let ai of atoms) {

            writer.write('\n');
            let offset = rowIndex[ai] * colCount;

            for (let w of writers) {
                w.write(ai, offset);
            }
        }      
    }

    export function writeAtomSites(models: { model: Core.Structure.MoleculeModel; fragments: Core.Structure.Queries.FragmentSeq }[], first: CifWriterContents, writer: CifStringWriter) {

        if (!models.some(m => m.fragments.length > 0)) return;

        let atomsCat = first.data.getCategory('_atom_site'),
            cols = atomsCat.columnNames;

        writer.write('loop_');
        for (let col of cols) {
            writer.write('\n' + col);
        }

        if (first.model.source === Core.Structure.MoleculeModelSource.File) {
            copyAtomSites(first.data, first.model, first.fragment.atomIndices, writer);
        } else {
            writeAtomSitesProper(first.data, first.model, first.fragment.atomIndices, writer);
        }

        for (let i = 1; i < models.length; i++) {

            let model = models[i];
            if (model.model.source === Core.Structure.MoleculeModelSource.File) {
                copyAtomSites(first.data, model.model, model.fragments.unionAtomIndices(), writer);
            } else {
                writeAtomSitesProper(first.data, model.model, model.fragments.unionAtomIndices(), writer);
            }
        }

        writer.write('\n#');
    }
}

export default CifCategoryWriters;