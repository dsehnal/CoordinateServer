"use strict";
var Core = require('LiteMol-core');
var Queries = Core.Structure.Query;
(function (QueryParamType) {
    QueryParamType[QueryParamType["String"] = 0] = "String";
    QueryParamType[QueryParamType["Integer"] = 1] = "Integer";
    QueryParamType[QueryParamType["Float"] = 2] = "Float";
})(exports.QueryParamType || (exports.QueryParamType = {}));
var QueryParamType = exports.QueryParamType;
exports.DefaultCategories = [
    '_entry',
    '_entity',
    '_struct_conf',
    '_struct_sheet_range',
    '_pdbx_struct_assembly',
    '_pdbx_struct_assembly_gen',
    '_pdbx_struct_oper_list',
    '_cell',
    '_symmetry',
    '_entity_poly',
    '_struct_asym',
    '_pdbx_struct_mod_residue',
    '_chem_comp_bond',
    '_atom_sites'
];
var SymmetryCategories = [
    '_entry',
    '_entity',
    '_cell',
    '_symmetry',
    '_struct_conf',
    '_struct_sheet_range',
    '_entity_poly',
    '_struct_asym',
    '_pdbx_struct_mod_residue',
    '_chem_comp_bond',
    '_atom_sites'
];
exports.CommonQueryParamsInfo = [
    { name: "modelId", type: QueryParamType.String, description: "If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field." },
    { name: "atomSitesOnly", type: QueryParamType.Integer, defaultValue: 0, description: "If 1, only the '_atom_site' category is returned." },
    { name: "format", type: QueryParamType.String, defaultValue: 'mmCIF', description: "Determines the output format (Currently supported: mmCIF)." },
    { name: "encoding", type: QueryParamType.String, defaultValue: 'cif', description: "Determines the output encoding (CIF or BCIF)." }
];
exports.CommonQueryParamsInfoMap = (function () {
    var map = new Map();
    exports.CommonQueryParamsInfo.forEach(function (i) { return map.set(i.name, i); });
    return map;
})();
var CommonParameters = {
    entityId: { name: "entityId", type: QueryParamType.String, description: "Corresponds to the '_entity.id' or '*.label_entity_id' field, depending on the context." },
    asymId: { name: "asymId", type: QueryParamType.String, description: "Corresponds to the '_atom_site.label_asym_id' field." },
    authAsymId: { name: "authAsymId", type: QueryParamType.String, description: "Corresponds to the '_atom_site.auth_asym_id' field." },
    name: { name: "name", type: QueryParamType.String, description: "Residue name. Corresponds to the '_atom_site.label_comp_id' field." },
    authName: { name: "authName", type: QueryParamType.String, description: "Author residue name. Corresponds to the '_atom_site.auth_comp_id' field." },
    insCode: { name: "insCode", type: QueryParamType.String, description: "Corresponds to the '_atom_site.pdbx_PDB_ins_code' field." },
    seqNumber: { name: "seqNumber", type: QueryParamType.Integer, description: "Residue seq. number. Corresponds to the '_atom_site.label_seq_id' field." },
    authSeqNumber: { name: "authSeqNumber", type: QueryParamType.Integer, description: "Author residue seq. number. Corresponds to the '_atom_site.auth_seq_id' field." },
};
exports.QueryMap = {
    "full": { query: function () { return Queries.everything(); }, description: "The full structure." },
    "het": { query: function () { return Queries.hetGroups(); }, description: "All non-water 'HETATM' records." },
    "cartoon": { query: function () { return Queries.cartoons(); }, description: "Atoms necessary to construct cartoons representation of the molecule (atoms named CA, O, O5', C3', N3 from polymer entities) + HET groups + water." },
    "backbone": { query: function () { return Queries.backbone(); }, description: "Atoms named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C4, C5' from polymer entities." },
    "sidechain": { query: function () { return Queries.sidechain(); }, description: "Atoms not named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C4, C5' from polymer entities." },
    "water": { query: function () { return Queries.entities({ type: 'water' }); }, description: "Atoms from entities with type water." },
    "entities": {
        description: "Entities that satisfy the given parameters.",
        query: function (p) { return Queries.entities(p); },
        queryParams: [
            CommonParameters.entityId,
            { name: "type", type: QueryParamType.String, description: "Corresponds to the '_entity.type' field (polymer / non-polymer / water)." }
        ]
    },
    "chains": {
        description: "Chains that satisfy the given parameters.",
        query: function (p) { return Queries.chains(p); },
        queryParams: [
            CommonParameters.entityId,
            CommonParameters.asymId,
            CommonParameters.authAsymId,
        ]
    },
    "residues": {
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
    "ambientResidues": {
        description: "Identifies all residues within the given radius from the source residue.",
        query: function (p, m) {
            var id = Core.Utils.extend({}, p);
            delete id.radius;
            return Queries.residues(id).ambientResidues(p.radius);
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
        description: "Identifies symmetry mates and returns the specified atom set and all residues within the given radius.",
        query: function (p, m) {
            var chains = Queries.chains.apply(null, m.chains.asymId.map(function (x) { return { asymId: x }; })), id = Core.Utils.extend({}, p);
            delete id.radius;
            return Queries.residues(id).inside(chains).ambientResidues(p.radius).wholeResidues();
        },
        modelTransform: function (p, m) {
            var id = Core.Utils.extend({}, p);
            delete id.radius;
            return Core.Structure.buildPivotGroupSymmetry(m, p.radius, Queries.residues(id).compile());
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
        description: "Constructs assembly with the given id.",
        query: function (p, m) {
            return Queries.everything();
        },
        modelTransform: function (p, m) {
            if (!m.assemblyInfo)
                throw 'Assembly info not present';
            var assembly = m.assemblyInfo.assemblies.filter(function (a) { return a.name.toLowerCase() === p.id; });
            if (!assembly.length)
                throw "Assembly with the id '" + p.id + "' not found";
            return Core.Structure.buildAssembly(m, assembly[0]);
        },
        queryParams: [
            { name: "id", type: QueryParamType.String, defaultValue: '1', description: "Corresponds to the '_pdbx_struct_assembly.id' field." }
        ],
        includedCategories: SymmetryCategories
    }
};
exports.QueryList = (function () {
    var list = [];
    for (var _i = 0, _a = Object.keys(exports.QueryMap); _i < _a.length; _i++) {
        var k = _a[_i];
        list.push({ name: k, description: exports.QueryMap[k] });
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
    return r;
}
exports.filterCommonQueryParams = filterCommonQueryParams;
