"use strict";
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Core = require("../lib/LiteMol-core");
var Queries = Core.Structure.Query;
var QueryParamType;
(function (QueryParamType) {
    QueryParamType[QueryParamType["String"] = 0] = "String";
    QueryParamType[QueryParamType["Integer"] = 1] = "Integer";
    QueryParamType[QueryParamType["Float"] = 2] = "Float";
})(QueryParamType = exports.QueryParamType || (exports.QueryParamType = {}));
exports.DefaultCategories = [
    '_entry',
    '_entity',
    '_exptl',
    '_struct_conf',
    '_struct_sheet_range',
    '_pdbx_struct_assembly',
    '_pdbx_struct_assembly_gen',
    '_pdbx_struct_oper_list',
    '_cell',
    '_symmetry',
    '_entity_poly',
    '_entity_poly_seq',
    '_struct_asym',
    '_struct_conn',
    '_struct_conn_type',
    '_pdbx_struct_mod_residue',
    '_chem_comp_bond',
    '_atom_sites'
];
var SymmetryCategories = [
    '_entry',
    '_entity',
    '_exptl',
    '_cell',
    '_symmetry',
    '_struct_conf',
    '_struct_sheet_range',
    '_entity_poly',
    '_struct_asym',
    '_struct_conn',
    '_struct_conn_type',
    '_pdbx_struct_mod_residue',
    '_chem_comp_bond',
    '_atom_sites'
];
exports.CommonQueryParamsInfo = [
    { name: "modelId", type: QueryParamType.String, description: "If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field." },
    { name: "atomSitesOnly", type: QueryParamType.Integer, defaultValue: 0, description: "If 1, only the '_atom_site' category is returned." },
    { name: "format", type: QueryParamType.String, defaultValue: 'mmCIF', description: "Determines the output format (Currently supported: 'mmCIF')." },
    { name: "encoding", type: QueryParamType.String, defaultValue: 'cif', description: "Determines the output encoding (text based 'CIF' or binary 'BCIF')." },
    { name: "lowPrecisionCoords", type: QueryParamType.Integer, defaultValue: 0, description: "If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision)." }
];
exports.CommonQueryParamsInfoMap = (function () {
    var map = new Map();
    exports.CommonQueryParamsInfo.forEach(function (i) { return map.set(i.name, i); });
    return map;
})();
var CommonParameters = {
    entityId: { name: "entityId", type: QueryParamType.String, description: "Corresponds to the '_entity.id' or '*.label_entity_id' field, depending on the context." },
    asymId: { name: "asymId", type: QueryParamType.String, description: "Corresponds to the '_atom_site.label_asym_id' field." },
    authAsymId: { name: "authAsymId", type: QueryParamType.String, exampleValue: 'A', description: "Corresponds to the '_atom_site.auth_asym_id' field." },
    name: { name: "name", type: QueryParamType.String, description: "Residue name. Corresponds to the '_atom_site.label_comp_id' field." },
    authName: { name: "authName", type: QueryParamType.String, exampleValue: 'REA', description: "Author residue name. Corresponds to the '_atom_site.auth_comp_id' field." },
    insCode: { name: "insCode", type: QueryParamType.String, description: "Corresponds to the '_atom_site.pdbx_PDB_ins_code' field." },
    seqNumber: { name: "seqNumber", type: QueryParamType.Integer, description: "Residue seq. number. Corresponds to the '_atom_site.label_seq_id' field." },
    authSeqNumber: { name: "authSeqNumber", type: QueryParamType.Integer, exampleValue: '200', description: "Author residue seq. number. Corresponds to the '_atom_site.auth_seq_id' field." },
};
var QueryMap = {
    "full": { niceName: 'Full Structure', query: function () { return Queries.everything(); }, description: "The full structure.", includedCategories: exports.DefaultCategories.concat(['_pdbx_nonpoly_scheme']) },
    "het": { niceName: 'HET Atoms', query: function () { return Queries.hetGroups(); }, description: "All non-water 'HETATM' records." },
    "cartoon": { niceName: 'Cartoon Representation', query: function () { return Queries.cartoons(); }, description: "Atoms necessary to construct cartoons representation of the molecule (atoms named CA, O, O5', C3', N3 from polymer entities) + HET atoms + water." },
    "backbone": { niceName: 'Backbone Atoms', query: function () { return Queries.backbone(); }, description: "Atoms named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C4, C5' from polymer entities." },
    "sidechain": { niceName: 'Sidechain Atoms', query: function () { return Queries.sidechain(); }, description: "Atoms not named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C4, C5' from polymer entities." },
    "water": { niceName: 'Water Atoms', query: function () { return Queries.entities({ type: 'water' }); }, description: "Atoms from entities with type water." },
    "entities": {
        niceName: 'Specific Entities',
        description: "Entities that satisfy the given parameters.",
        query: function (p) { return Queries.entities(p); },
        queryParams: [
            CommonParameters.entityId,
            { name: "type", type: QueryParamType.String, exampleValue: 'polymer', description: "Corresponds to the '_entity.type' field (polymer / non-polymer / water)." }
        ]
    },
    "chains": {
        niceName: 'Specific Chains',
        description: "Chains that satisfy the given parameters.",
        query: function (p) { return Queries.chains(p); },
        queryParams: [
            CommonParameters.entityId,
            CommonParameters.asymId,
            CommonParameters.authAsymId,
        ]
    },
    "residues": {
        niceName: 'Specific Residues',
        description: "Residues that satisfy the given parameters.",
        query: function (p) { return Queries.residues(p); },
        queryParams: [
            CommonParameters.entityId,
            CommonParameters.asymId,
            CommonParameters.authAsymId,
            CommonParameters.name,
            CommonParameters.authName,
            CommonParameters.insCode,
            CommonParameters.seqNumber,
            CommonParameters.authSeqNumber
        ]
    },
    "trace": {
        niceName: 'C-Alpha/P Trace',
        description: "Atoms named CA and P from polymer entities + optionally HET and/or water atoms.",
        query: function (p) {
            var parts = [Queries.polymerTrace('CA', 'P')];
            if (!!p.het)
                parts.push(Queries.hetGroups());
            if (!!p.water)
                parts.push(Queries.entities({ type: 'water' }));
            return Queries.or.apply(null, parts).union();
        },
        queryParams: [
            { name: "het", type: QueryParamType.Integer, defaultValue: 0, exampleValue: '1', description: "If 1, include HET atoms." },
            { name: "water", type: QueryParamType.Integer, defaultValue: 0, description: "If 1, include water atoms." }
        ]
    },
    "ambientResidues": {
        niceName: 'Residues Inside a Sphere',
        description: "Identifies all residues within the given radius from the source residue.",
        query: function (p, m) {
            var id = Core.Utils.extend({}, p);
            delete id.radius;
            return Queries.residues(id).union().ambientResidues(p.radius);
        },
        queryParams: [
            CommonParameters.entityId,
            CommonParameters.asymId,
            CommonParameters.authAsymId,
            CommonParameters.name,
            CommonParameters.authName,
            CommonParameters.insCode,
            CommonParameters.seqNumber,
            CommonParameters.authSeqNumber,
            {
                name: "radius",
                type: QueryParamType.Float,
                defaultValue: 5,
                exampleValue: '5',
                description: "Value in Angstroms.",
                validation: function (v) {
                    if (v < 1 || v > 10) {
                        throw "Invalid radius for ligand interaction query (must be a value between 1 and 10).";
                    }
                }
            },
        ]
    },
    "ligandInteraction": {
        niceName: 'Ligand Interaction',
        description: "Identifies symmetry mates and returns the specified atom set and all residues within the given radius.",
        query: function (p, m) {
            var chains = Queries.chains.apply(null, m.data.chains.asymId.map(function (x) { return { asymId: x }; })), id = Core.Utils.extend({}, p);
            delete id.radius;
            return Queries.residues(id).inside(chains).union().ambientResidues(p.radius).wholeResidues();
        },
        modelTransform: function (p, m) {
            var id = Core.Utils.extend({}, p);
            delete id.radius;
            var symm = Core.Structure.buildPivotGroupSymmetry(m, p.radius, Queries.residues(id).compile());
            return symm;
        },
        queryParams: [
            CommonParameters.entityId,
            CommonParameters.asymId,
            CommonParameters.authAsymId,
            CommonParameters.name,
            CommonParameters.authName,
            CommonParameters.insCode,
            CommonParameters.seqNumber,
            CommonParameters.authSeqNumber,
            {
                name: "radius",
                type: QueryParamType.Float,
                defaultValue: 5,
                exampleValue: '5',
                description: "Value in Angstroms.",
                validation: function (v) {
                    if (v < 1 || v > 10) {
                        throw "Invalid radius for ligand interaction query (must be a value between 1 and 10).";
                    }
                }
            },
        ],
        includedCategories: SymmetryCategories
    },
    "symmetryMates": {
        niceName: 'Symmetry Mates',
        description: "Identifies symmetry mates within the given radius.",
        query: function (p, m) {
            return Queries.everything();
        },
        modelTransform: function (p, m) {
            return Core.Structure.buildSymmetryMates(m, p.radius);
        },
        queryParams: [
            {
                name: "radius",
                type: QueryParamType.Float,
                defaultValue: 5,
                exampleValue: '5',
                description: "Value in Angstroms.",
                validation: function (v) {
                    if (v < 1 || v > 50) {
                        throw "Invalid radius for symmetry mates query (must be a value between 1 and 50).";
                    }
                }
            },
        ],
        includedCategories: SymmetryCategories
    },
    "assembly": {
        niceName: 'Assembly',
        exampleId: '1e12',
        description: "Constructs assembly with the given id.",
        query: function (p, m) {
            return Queries.everything();
        },
        modelTransform: function (p, m) {
            if (!m.data.assemblyInfo)
                throw 'Assembly info not present';
            var assembly = m.data.assemblyInfo.assemblies.filter(function (a) { return a.name.toLowerCase() === p.id; });
            if (!assembly.length)
                throw "Assembly with the id '" + p.id + "' not found";
            return Core.Structure.buildAssembly(m, assembly[0]);
        },
        queryParams: [
            { name: "id", type: QueryParamType.String, defaultValue: '1', exampleValue: '1', description: "Corresponds to the '_pdbx_struct_assembly.id' field." }
        ],
        includedCategories: SymmetryCategories.concat(['_pdbx_nonpoly_scheme'])
    }
};
function getQueryByName(name) {
    return QueryMap[name];
}
exports.getQueryByName = getQueryByName;
exports.QueryList = (function () {
    var list = [];
    for (var _i = 0, _a = Object.keys(QueryMap); _i < _a.length; _i++) {
        var k = _a[_i];
        list.push({ name: k, description: QueryMap[k] });
    }
    list.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    return list;
})();
// normalize the queries
(function () {
    for (var _i = 0, QueryList_1 = exports.QueryList; _i < QueryList_1.length; _i++) {
        var q = QueryList_1[_i];
        var m = q.description;
        var paramMap = new Map();
        m.queryParams = m.queryParams || [];
        for (var _a = 0, _b = m.queryParams; _a < _b.length; _a++) {
            var p = _b[_a];
            paramMap.set(p.name, p);
        }
        m.paramMap = paramMap;
    }
})();
function _filterQueryParams(p, paramMap, paramList) {
    var ret = {};
    for (var _i = 0, _a = Object.keys(p); _i < _a.length; _i++) {
        var key = _a[_i];
        if (!paramMap.has(key))
            continue;
        var info = paramMap.get(key);
        if (p[key] !== undefined && p[key] !== null && p[key]['length'] === 0) {
            continue;
        }
        switch (info.type) {
            case QueryParamType.String:
                ret[key] = p[key];
                break;
            case QueryParamType.Integer:
                ret[key] = parseInt(p[key]);
                break;
            case QueryParamType.Float:
                ret[key] = parseFloat(p[key]);
                break;
        }
        if (info.validation)
            info.validation(ret[key]);
    }
    for (var _b = 0, paramList_1 = paramList; _b < paramList_1.length; _b++) {
        var prm = paramList_1[_b];
        if (ret[prm.name] === undefined) {
            if (prm.required) {
                throw "The parameter '" + prm.name + "' is required.";
            }
            ret[prm.name] = prm.defaultValue;
        }
    }
    return ret;
}
function filterQueryParams(p, query) {
    return _filterQueryParams(p, query.paramMap, query.queryParams);
}
exports.filterQueryParams = filterQueryParams;
function filterCommonQueryParams(p) {
    var r = _filterQueryParams(p, exports.CommonQueryParamsInfoMap, exports.CommonQueryParamsInfo);
    r.atomSitesOnly = !!r.atomSitesOnly;
    r.lowPrecisionCoords = !!r.lowPrecisionCoords;
    return r;
}
exports.filterCommonQueryParams = filterCommonQueryParams;
