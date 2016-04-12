"use strict";
var Core = require('LiteMol-core');
var CifCategoryWriters;
(function (CifCategoryWriters) {
    var CifWriterContents = (function () {
        function CifWriterContents(fragment, model, data) {
            this.fragment = fragment;
            this.model = model;
            this.data = data;
        }
        Object.defineProperty(CifWriterContents.prototype, "isComplete", {
            get: function () {
                return this.model.source === Core.Structure.MoleculeModelSource.File
                    ? this.fragment.atomCount === this.model.atoms.count
                    : false;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CifWriterContents.prototype, "residueNameSet", {
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
        CifWriterContents.prototype.computeModres = function () {
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
        Object.defineProperty(CifWriterContents.prototype, "modifiedResidues", {
            get: function () {
                this.computeModres();
                return this._modres;
            },
            enumerable: true,
            configurable: true
        });
        CifWriterContents.prototype.getSourceResidueStringId = function (i) {
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
        return CifWriterContents;
    }());
    CifCategoryWriters.CifWriterContents = CifWriterContents;
    function isMultiline(value) {
        return !!value && value.indexOf('\n') >= 0;
    }
    function writeSingleRecord(fields, ctx, writer) {
        var width = fields.reduce(function (w, s) { return Math.max(w, s.name.length); }, 0) + 5;
        for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
            var f = fields_1[_i];
            writer.writer.writePadRight(f.name, width);
            var val = f.src(ctx, 0);
            if (isMultiline(val)) {
                writer.writeMultiline(val);
                writer.writer.newline();
            }
            else {
                writer.writeChecked(val);
            }
            writer.writer.newline();
        }
    }
    function writeLoopRecords(fields, ctx, count, writer) {
        writer.writeLine('loop_');
        for (var _i = 0, fields_2 = fields; _i < fields_2.length; _i++) {
            var f = fields_2[_i];
            writer.writeLine(f.name);
        }
        for (var i = 0; i < count; i++) {
            for (var _a = 0, fields_3 = fields; _a < fields_3.length; _a++) {
                var f = fields_3[_a];
                var val = f.src(ctx, i);
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
    }
    function writeRecords(fields, ctx, count, writer) {
        if (count === 0)
            return;
        else if (count === 1) {
            writeSingleRecord(fields, ctx, writer);
        }
        else {
            writeLoopRecords(fields, ctx, count, writer);
        }
    }
    CifCategoryWriters.writeRecords = writeRecords;
    function copyCategory(name, content, writer) {
        var cat = content.data.getCategory(name);
        if (!cat)
            return;
        writer.write(content.data.data.substring(cat.startIndex, cat.endIndex));
    }
    function writeCopyCategory(name) {
        return function (content, writer) {
            copyCategory(name, content, writer);
        };
    }
    function writeEntry(content, writer) {
        writer.write('_entry.id     ');
        writer.writeChecked(content.model.id);
        writer.write('\n#\n');
    }
    function writeEntity(content, writer) {
        if (content.isComplete) {
            copyCategory('_entity', content, writer);
            return;
        }
        var f = content.fragment;
        if (!f.entityIndices.length)
            return;
        var e = content.model.entities;
        var ctx = { id: e.entityId, type: e.type, index: f.entityIndices };
        var fields = [
            { name: '_entity.id', src: function (ctx, i) { return ctx.id[ctx.index[i]]; } },
            { name: '_entity.type', src: function (ctx, i) { return ctx.type[ctx.index[i]]; } },
            { name: '_entity.src_method', src: function (ctx, i) { return '?'; } },
            { name: '_entity.pdbx_description', src: function (ctx, i) { return '?'; } },
            { name: '_entity.formula_weight', src: function (ctx, i) { return '?'; } },
            { name: '_entity.pdbx_number_of_molecules', src: function (ctx, i) { return '?'; } },
            { name: '_entity.details', src: function (ctx, i) { return 'Generated to provide info about entity type'; } },
            { name: '_entity.pdbx_mutation', src: function (ctx, i) { return '?'; } },
            { name: '_entity.pdbx_fragment', src: function (ctx, i) { return '?'; } },
            { name: '_entity.pdbx_ec', src: function (ctx, i) { return '?'; } }
        ];
        writeRecords(fields, ctx, f.entityIndices.length, writer);
        writer.write('#\n');
    }
    function writeChemCompBond(content, writer) {
        var cat = content.data.getCategory('_chem_comp_bond');
        if (!cat)
            return;
        var cols = cat.columnArray;
        var nameCol = cat.getColumn('_chem_comp_bond.comp_id');
        if (!nameCol)
            return;
        var rows = [];
        var names = content.residueNameSet;
        for (var i = 0, _l = cat.rowCount; i < _l; i++) {
            var n = nameCol.getString(i);
            if (names.has(n))
                rows[rows.length] = i;
        }
        if (!rows.length)
            return;
        writer.writeLine('loop_');
        for (var _i = 0, cols_1 = cols; _i < cols_1.length; _i++) {
            var c = cols_1[_i];
            writer.writeLine(c.name);
        }
        for (var _a = 0, rows_1 = rows; _a < rows_1.length; _a++) {
            var r = rows_1[_a];
            for (var _b = 0, cols_2 = cols; _b < cols_2.length; _b++) {
                var c = cols_2[_b];
                writer.writeChecked(c.getString(r));
            }
            writer.newline();
        }
        writer.write('#\n');
    }
    function findSecondary(test, content) {
        if (!content.model.secondaryStructure)
            return;
        var starts = [], ends = [], lengths = [], ssIndices = [];
        var struct = content.model.secondaryStructure.filter(function (s) { return test(s.type); });
        if (!struct.length)
            return;
        var currentStructure = 0, currentStart = struct[0].startResidueIndex, currentEnd = struct[0].endResidueIndex;
        var residues = content.fragment.residueIndices;
        for (var k = 0, length_1 = residues.length; k < length_1;) {
            var residueIndex = residues[k];
            if (residueIndex >= currentStart && residueIndex < currentEnd) {
                //console.log(`start, ${residueIndex}, ${currentStart}, ${currentEnd}`);
                var start = residueIndex;
                var slen = 0;
                while (k < length_1 && currentEnd > residues[k]) {
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
    function writeHelices(content, writer) {
        //if (content.model.source === Core.Structure.MoleculeModelSource.Computed) return;
        var helix = Core.Structure.SecondaryStructureType.Helix, turn = Core.Structure.SecondaryStructureType.Turn;
        var ssIndices = findSecondary(function (t) { return t === helix || t === turn; }, content);
        if (!ssIndices || !ssIndices.starts.length)
            return;
        var rs = content.model.residues;
        var ctx = { indices: ssIndices, residues: rs, index: content.fragment.residueIndices, helixCounter: 0, turnCounter: 0, helix: helix, turn: turn };
        var fields = [
            { name: '_struct_conf.conf_type_id', src: function (ctx, i) { return ctx.indices.struct[ctx.indices.ssIndices[i]].type === ctx.helix ? 'HELX_P' : 'TURN_P'; } },
            { name: '_struct_conf.id', src: function (ctx, i) { return ctx.indices.struct[ctx.indices.ssIndices[i]].type === ctx.helix ? 'HELX_P' + (++ctx.helixCounter) : 'TURN_P' + (++ctx.turnCounter); } },
            { name: '_struct_conf.pdbx_PDB_helix_id', src: function (ctx, i) { return (i + 1).toString(); } },
            { name: '_struct_conf.beg_label_comp_id', src: function (ctx, i) { return ctx.residues.name[ctx.indices.starts[i]]; } },
            { name: '_struct_conf.beg_label_asym_id', src: function (ctx, i) { return ctx.residues.asymId[ctx.indices.starts[i]]; } },
            { name: '_struct_conf.beg_label_seq_id', src: function (ctx, i) { return ctx.residues.seqNumber[ctx.indices.starts[i]].toString(); } },
            { name: '_struct_conf.pdbx_beg_PDB_ins_code', src: function (ctx, i) { return ctx.residues.insCode[ctx.indices.starts[i]]; } },
            { name: '_struct_conf.end_label_comp_id', src: function (ctx, i) { return ctx.residues.name[ctx.indices.ends[i]]; } },
            { name: '_struct_conf.end_label_asym_id', src: function (ctx, i) { return ctx.residues.asymId[ctx.indices.ends[i]]; } },
            { name: '_struct_conf.end_label_seq_id', src: function (ctx, i) { return ctx.residues.seqNumber[ctx.indices.ends[i]].toString(); } },
            { name: '_struct_conf.pdbx_end_PDB_ins_code', src: function (ctx, i) { return ctx.residues.insCode[ctx.indices.ends[i]]; } },
            { name: '_struct_conf.beg_auth_comp_id', src: function (ctx, i) { return ctx.residues.authName[ctx.indices.starts[i]]; } },
            { name: '_struct_conf.beg_auth_asym_id', src: function (ctx, i) { return ctx.residues.authAsymId[ctx.indices.starts[i]]; } },
            { name: '_struct_conf.beg_auth_seq_id', src: function (ctx, i) { return ctx.residues.authSeqNumber[ctx.indices.starts[i]].toString(); } },
            { name: '_struct_conf.end_auth_comp_id', src: function (ctx, i) { return ctx.residues.authName[ctx.indices.ends[i]]; } },
            { name: '_struct_conf.end_auth_asym_id', src: function (ctx, i) { return ctx.residues.authAsymId[ctx.indices.ends[i]]; } },
            { name: '_struct_conf.end_auth_seq_id', src: function (ctx, i) { return ctx.residues.authSeqNumber[ctx.indices.ends[i]].toString(); } },
            { name: '_struct_conf.pdbx_PDB_helix_class', src: function (ctx, i) { var val = ctx.indices.struct[ctx.indices.ssIndices[i]].info.helixClass; return val !== null && val !== undefined ? '' + val : '?'; } },
            { name: '_struct_conf.details', src: function (ctx, i) { return '?'; } },
            { name: '_struct_conf.pdbx_PDB_helix_length', src: function (ctx, i) { return ctx.indices.lengths[i].toString(); } }
        ];
        writeRecords(fields, ctx, ssIndices.starts.length, writer);
        writer.write('#\n');
    }
    function writeSheets(content, writer) {
        //if (content.model.source === Core.Structure.MoleculeModelSource.Computed) return;
        var sheet = Core.Structure.SecondaryStructureType.Sheet;
        var ssIndices = findSecondary(function (t) { return t === sheet; }, content);
        if (!ssIndices || !ssIndices.starts.length)
            return;
        var rs = content.model.residues;
        var ctx = { indices: ssIndices, residues: rs, index: content.fragment.residueIndices };
        var fields = [
            { name: '_struct_sheet_range.conf_type_id', src: function (ctx, i) { var val = ctx.indices.struct[ctx.indices.ssIndices[i]].info.sheetId; return val !== null && val !== undefined ? '' + val : (i + 1).toString(); } },
            { name: '_struct_sheet_range.id', src: function (ctx, i) { var val = ctx.indices.struct[ctx.indices.ssIndices[i]].info.id; return val !== null && val !== undefined ? '' + val : (i + 1).toString(); } },
            { name: '_struct_sheet_range.beg_label_comp_id', src: function (ctx, i) { return ctx.residues.name[ctx.indices.starts[i]]; } },
            { name: '_struct_sheet_range.beg_label_asym_id', src: function (ctx, i) { return ctx.residues.asymId[ctx.indices.starts[i]]; } },
            { name: '_struct_sheet_range.beg_label_seq_id', src: function (ctx, i) { return ctx.residues.seqNumber[ctx.indices.starts[i]].toString(); } },
            { name: '_struct_sheet_range.pdbx_beg_PDB_ins_code', src: function (ctx, i) { return ctx.residues.insCode[ctx.indices.starts[i]]; } },
            { name: '_struct_sheet_range.end_label_comp_id', src: function (ctx, i) { return ctx.residues.name[ctx.indices.ends[i]]; } },
            { name: '_struct_sheet_range.end_label_asym_id', src: function (ctx, i) { return ctx.residues.asymId[ctx.indices.ends[i]]; } },
            { name: '_struct_sheet_range.end_label_seq_id', src: function (ctx, i) { return ctx.residues.seqNumber[ctx.indices.ends[i]].toString(); } },
            { name: '_struct_sheet_range.pdbx_end_PDB_ins_code', src: function (ctx, i) { return ctx.residues.insCode[ctx.indices.ends[i]]; } },
            { name: '_struct_sheet_range.symmetry', src: function (ctx, i) { var val = ctx.indices.struct[ctx.indices.ssIndices[i]].info.symmetry; return val !== null && val !== undefined ? '' + val : '?'; } },
            { name: '_struct_sheet_range.beg_auth_comp_id', src: function (ctx, i) { return ctx.residues.authName[ctx.indices.starts[i]]; } },
            { name: '_struct_sheet_range.beg_auth_asym_id', src: function (ctx, i) { return ctx.residues.authAsymId[ctx.indices.starts[i]]; } },
            { name: '_struct_sheet_range.beg_auth_seq_id', src: function (ctx, i) { return ctx.residues.authSeqNumber[ctx.indices.starts[i]].toString(); } },
            { name: '_struct_sheet_range.end_auth_comp_id', src: function (ctx, i) { return ctx.residues.authName[ctx.indices.ends[i]]; } },
            { name: '_struct_sheet_range.end_auth_asym_id', src: function (ctx, i) { return ctx.residues.authAsymId[ctx.indices.ends[i]]; } },
            { name: '_struct_sheet_range.end_auth_seq_id', src: function (ctx, i) { return ctx.residues.authSeqNumber[ctx.indices.ends[i]].toString(); } },
        ];
        writeRecords(fields, ctx, ssIndices.starts.length, writer);
        writer.write('#\n');
    }
    function writeEntityPoly(content, writer) {
        var _entity_poly = content.data.getCategory('_entity_poly');
        if (!_entity_poly)
            return;
        var entityMap = new Map();
        //let repl = /[ \t\n\r]/g;
        var poly = [];
        for (var i = 0; i < _entity_poly.rowCount; i++) {
            var eId = _entity_poly.getStringValue('_entity_poly.entity_id', i);
            //let strand = _entity_poly.getStringValue('_entity_poly.pdbx_strand_id', i);
            //let id = `${eId} ${strand}`;
            var e = {
                entity_id: eId,
                type: _entity_poly.getStringValue('_entity_poly.type', i),
                nstd_linkage: _entity_poly.getStringValue('_entity_poly.nstd_linkage', i),
                nstd_monomer: _entity_poly.getStringValue('_entity_poly.nstd_monomer', i),
                pdbx_seq_one_letter_code: _entity_poly.getStringValue('_entity_poly.pdbx_seq_one_letter_code', i),
                pdbx_seq_one_letter_code_can: _entity_poly.getStringValue('_entity_poly.pdbx_seq_one_letter_code_can', i),
                pdbx_strand_id: '',
                strand_set: new Set()
            };
            entityMap.set(eId, e);
            poly.push(e);
        }
        var chains = content.model.chains;
        var residues = content.model.residues;
        var modRes = content.modifiedResidues;
        for (var _i = 0, _a = content.fragment.chainIndices; _i < _a.length; _i++) {
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
        var ctx = poly;
        var fields = [
            { name: '_entity_poly.entity_id', src: function (ctx, i) { return ctx[i].entity_id; } },
            { name: '_entity_poly.type', src: function (ctx, i) { return ctx[i].type; } },
            { name: '_entity_poly.nstd_linkage', src: function (ctx, i) { return ctx[i].nstd_linkage; } },
            { name: '_entity_poly.nstd_monomer', src: function (ctx, i) { return ctx[i].nstd_monomer; } },
            { name: '_entity_poly.pdbx_seq_one_letter_code', src: function (ctx, i) { return ctx[i].pdbx_seq_one_letter_code; } },
            { name: '_entity_poly.pdbx_seq_one_letter_code_can', src: function (ctx, i) { return ctx[i].pdbx_seq_one_letter_code_can; } },
            { name: '_entity_poly.pdbx_strand_id', src: function (ctx, i) { return ctx[i].pdbx_strand_id; } }
        ];
        writeRecords(fields, ctx, poly.length, writer);
        writer.write('#\n');
    }
    function writeModRes(content, writer) {
        var _mod_res = content.data.getCategory('_pdbx_struct_mod_residue');
        if (!_mod_res)
            return;
        var modResIndices = [], residues = [];
        var info = content.modifiedResidues;
        if (!info.map.size)
            return;
        var names = content.model.residues.name;
        for (var _i = 0, _a = content.fragment.residueIndices; _i < _a.length; _i++) {
            var res = _a[_i];
            if (!info.names.has(names[res]))
                continue;
            var e = info.map.get(content.getSourceResidueStringId(res));
            if (e) {
                modResIndices[modResIndices.length] = e.i;
                residues[residues.length] = res;
            }
        }
        var ctx = { _mod_res: _mod_res, modResIndices: modResIndices, residues: residues, resTable: content.model.residues };
        var fields = [
            { name: '_pdbx_struct_mod_residue.id', src: function (ctx, i) { return (i + 1).toString(); } },
            { name: '_pdbx_struct_mod_residue.label_asym_id', src: function (ctx, i) { return ctx.resTable.asymId[ctx.residues[i]]; } },
            { name: '_pdbx_struct_mod_residue.label_seq_id', src: function (ctx, i) { return ctx.resTable.seqNumber[ctx.residues[i]].toString(); } },
            { name: '_pdbx_struct_mod_residue.label_comp_id', src: function (ctx, i) { return ctx.resTable.name[ctx.residues[i]]; } },
            { name: '_pdbx_struct_mod_residue.auth_asym_id', src: function (ctx, i) { return ctx.resTable.authAsymId[ctx.residues[i]]; } },
            { name: '_pdbx_struct_mod_residue.auth_seq_id', src: function (ctx, i) { return ctx.resTable.authSeqNumber[ctx.residues[i]].toString(); } },
            { name: '_pdbx_struct_mod_residue.auth_comp_id', src: function (ctx, i) { return ctx.resTable.authName[ctx.residues[i]]; } },
            { name: '_pdbx_struct_mod_residue.PDB_ins_code', src: function (ctx, i) { return ctx.resTable.insCode[ctx.residues[i]]; } },
            { name: '_pdbx_struct_mod_residue.parent_comp_id', src: function (ctx, i) { return ctx._mod_res.getStringValue('_pdbx_struct_mod_residue.parent_comp_id', ctx.modResIndices[i]); } },
            { name: '_pdbx_struct_mod_residue.details', src: function (ctx, i) { return ctx._mod_res.getStringValue('_pdbx_struct_mod_residue.details', ctx.modResIndices[i]); } }
        ];
        writeRecords(fields, ctx, modResIndices.length, writer);
        writer.write('#\n');
    }
    function writeStructAsym(content, writer) {
        var ctx = { index: content.fragment.chainIndices, chains: content.model.chains, parent: content.model.parent };
        var fields = [
            { name: '_struct_asym.id', src: function (ctx, i) { return ctx.chains.asymId[ctx.index[i]]; } },
            { name: '_struct_asym.pdbx_blank_PDB_chainid_flag', src: function (ctx, i) { return !ctx.chains.asymId[ctx.index[i]] ? 'Y' : 'N'; } },
            { name: '_struct_asym.pdbx_modified', src: function (ctx, i) { return 'Y'; } },
            { name: '_struct_asym.entity_id', src: function (ctx, i) { return ctx.chains.entityId[ctx.index[i]]; } },
            {
                name: '_struct_asym.details', src: function (ctx, i) {
                    var idx = ctx.index[i];
                    if (ctx.chains.sourceChainIndex && ctx.parent) {
                        if (ctx.parent.chains.asymId[ctx.chains.sourceChainIndex[idx]] !== ctx.chains.asymId[idx]) {
                            return 'Added by the Coordinate Server';
                        }
                    }
                    return 'Might not contain all original atoms depending on the query used';
                }
            },
        ];
        writeRecords(fields, ctx, content.fragment.chainIndices.length, writer);
        writer.write('#\n');
    }
    CifCategoryWriters.CategoryWriters = {
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
    var AtomSiteCellModelStringWriter = (function () {
        function AtomSiteCellModelStringWriter(w, col) {
            this.w = w;
            this.col = col;
        }
        AtomSiteCellModelStringWriter.prototype.write = function (aI, offset) { this.w.writeChecked(this.col[aI]); };
        return AtomSiteCellModelStringWriter;
    }());
    var AtomSiteCellModelIndirectWriter = (function () {
        function AtomSiteCellModelIndirectWriter(w, colA, colB) {
            this.w = w;
            this.colA = colA;
            this.colB = colB;
        }
        AtomSiteCellModelIndirectWriter.prototype.write = function (aI, offset) { this.w.writeChecked(this.colB[this.colA[aI]]); };
        return AtomSiteCellModelIndirectWriter;
    }());
    var AtomSiteCellModelIntegerWriter = (function () {
        function AtomSiteCellModelIntegerWriter(w, col) {
            this.w = w;
            this.col = col;
        }
        AtomSiteCellModelIntegerWriter.prototype.write = function (aI, offset) { this.w.writeInteger(this.col[aI]); };
        return AtomSiteCellModelIntegerWriter;
    }());
    var AtomSiteCellModelFloatWriter = (function () {
        function AtomSiteCellModelFloatWriter(w, col, prec) {
            this.w = w;
            this.col = col;
            this.prec = prec;
        }
        AtomSiteCellModelFloatWriter.prototype.write = function (aI, offset) { this.w.writeFloat(this.col[aI], this.prec); };
        return AtomSiteCellModelFloatWriter;
    }());
    var AtomSiteCellTokenWriter = (function () {
        function AtomSiteCellTokenWriter(w, i, data, tokens) {
            this.w = w;
            this.i = i;
            this.data = data;
            this.tokens = tokens;
        }
        AtomSiteCellTokenWriter.prototype.write = function (aI, offset) {
            var o = offset + this.i;
            this.w.writeChecked(this.data.substring(this.tokens[2 * o], this.tokens[2 * o + 1]));
        };
        return AtomSiteCellTokenWriter;
    }());
    function copyAtomSites(data, model, atoms, writer) {
        var atomsCat = data.getCategory('_atom_site'), tokens = atomsCat.tokens, cols = atomsCat.columnNames, source = data.data, colCount = cols.length;
        var rowIndex = model.atoms.rowIndex;
        for (var _i = 0, atoms_1 = atoms; _i < atoms_1.length; _i++) {
            var ai = atoms_1[_i];
            writer.write('\n');
            var offset = rowIndex[ai] * colCount;
            for (var i = 0; i < colCount; i++) {
                writer.writeChecked(source.substring(tokens[2 * (offset + i)], tokens[2 * (offset + i) + 1]));
            }
        }
    }
    function writeAtomSitesProper(data, model, atoms, writer) {
        var atomsCat = data.getCategory('_atom_site'), tokens = atomsCat.tokens, cols = atomsCat.columnNames, source = data.data, colCount = cols.length;
        var rowIndex = model.atoms.rowIndex;
        var writers = cols.map(function (c, i) {
            switch (c) {
                case '_atom_site.id': return new AtomSiteCellModelIntegerWriter(writer, model.atoms.id);
                case '_atom_site.Cartn_x': return new AtomSiteCellModelFloatWriter(writer, model.atoms.x, 1000);
                case '_atom_site.Cartn_y': return new AtomSiteCellModelFloatWriter(writer, model.atoms.y, 1000);
                case '_atom_site.Cartn_z': return new AtomSiteCellModelFloatWriter(writer, model.atoms.z, 1000);
                case '_atom_site.label_asym_id': return new AtomSiteCellModelIndirectWriter(writer, model.atoms.residueIndex, model.residues.asymId);
                case '_atom_site.auth_asym_id': return new AtomSiteCellModelIndirectWriter(writer, model.atoms.residueIndex, model.residues.authAsymId);
                default: return new AtomSiteCellTokenWriter(writer, i, source, tokens);
            }
        });
        for (var _i = 0, atoms_2 = atoms; _i < atoms_2.length; _i++) {
            var ai = atoms_2[_i];
            writer.write('\n');
            var offset = rowIndex[ai] * colCount;
            for (var _a = 0, writers_1 = writers; _a < writers_1.length; _a++) {
                var w = writers_1[_a];
                w.write(ai, offset);
            }
        }
    }
    function writeAtomSites(models, first, writer) {
        if (!models.some(function (m) { return m.fragments.length > 0; }))
            return;
        var atomsCat = first.data.getCategory('_atom_site'), cols = atomsCat.columnNames;
        writer.write('loop_');
        for (var _i = 0, cols_3 = cols; _i < cols_3.length; _i++) {
            var col = cols_3[_i];
            writer.write('\n' + col);
        }
        if (first.model.source === Core.Structure.MoleculeModelSource.File) {
            copyAtomSites(first.data, first.model, first.fragment.atomIndices, writer);
        }
        else {
            writeAtomSitesProper(first.data, first.model, first.fragment.atomIndices, writer);
        }
        for (var i = 1; i < models.length; i++) {
            var model = models[i];
            if (model.model.source === Core.Structure.MoleculeModelSource.File) {
                copyAtomSites(first.data, model.model, model.fragments.unionAtomIndices(), writer);
            }
            else {
                writeAtomSitesProper(first.data, model.model, model.fragments.unionAtomIndices(), writer);
            }
        }
        writer.write('\n#');
    }
    CifCategoryWriters.writeAtomSites = writeAtomSites;
})(CifCategoryWriters || (CifCategoryWriters = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CifCategoryWriters;
