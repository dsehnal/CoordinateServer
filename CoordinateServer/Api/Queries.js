"use strict";
var Core = require('LiteMol-core');
var Queries = Core.Structure.Queries;
var Generators = Queries.Generators;
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
    { name: "modelId", type: QueryParamType.String },
    { name: "atomSitesOnly", type: QueryParamType.Integer, defaultValue: 0 },
];
exports.QueryMap = {
    "het": { query: function () { return Generators.hetGroups(); }, description: "All non-water 'HETATM' records." },
    "cartoon": { query: function () { return Generators.cartoons(); }, description: "Atoms necessary to construct cartoons representation of the molecule (atoms named CA, O, O5', C3', N3 from polymer entities)." },
    "backbone": { query: function () { return Generators.backbone(); }, description: "Atoms named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C5' from polymer entities." },
    "sidechain": { query: function () { return Generators.sidechain(); }, description: "Atoms not named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C5' from polymer entities." },
    "water": { query: function () { return Generators.entities({ type: 'water' }); }, description: "Atoms from entities with type water." },
    "entities": {
        description: "Entities that satisfy the given parameters.",
        query: function (p) { return Generators.entities(p); },
        queryParams: [
            { name: "entityId", type: QueryParamType.String },
            { name: "type", type: QueryParamType.String }
        ]
    },
    "chains": {
        description: "Chains that satisfy the given parameters.",
        query: function (p) { return Generators.chains(p); },
        queryParams: [
            { name: "entityId", type: QueryParamType.String },
            { name: "asymId", type: QueryParamType.String },
            { name: "authAsymId", type: QueryParamType.String }
        ]
    },
    "residues": {
        description: "Residues that satisfy the given parameters.",
        query: function (p) { return Generators.residues(p); },
        queryParams: [
            { name: "entityId", type: QueryParamType.String },
            { name: "asymId", type: QueryParamType.String },
            { name: "authAsymId", type: QueryParamType.String },
            { name: "name", type: QueryParamType.String },
            { name: "authName", type: QueryParamType.String },
            { name: "insCode", type: QueryParamType.String },
            { name: "seqNumber", type: QueryParamType.Integer },
            { name: "authSeqNumber", type: QueryParamType.Integer }
        ]
    },
    "ambientResidues": {
        description: "Identifies all residues within the given radius from the source residue.",
        query: function (p, m) {
            var id = Core.Utils.shallowClone(p);
            delete id.radius;
            return Generators.residues(id).ambientResidues(p.radius);
        },
        queryParams: [
            { name: "entityId", type: QueryParamType.String },
            { name: "asymId", type: QueryParamType.String },
            { name: "authAsymId", type: QueryParamType.String },
            { name: "name", type: QueryParamType.String },
            { name: "authName", type: QueryParamType.String },
            { name: "insCode", type: QueryParamType.String },
            { name: "seqNumber", type: QueryParamType.Integer },
            { name: "authSeqNumber", type: QueryParamType.Integer },
            {
                name: "radius", type: QueryParamType.Float, defaultValue: 5,
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
            var chains = Generators.chains.apply(null, m.chains.asymId.map(function (x) { return { asymId: x }; })), id = Core.Utils.shallowClone(p);
            delete id.radius;
            return Generators.residues(id).inside(chains).ambientResidues(p.radius).wholeResidues();
        },
        modelTransform: function (p, m) {
            var id = Core.Utils.shallowClone(p);
            delete id.radius;
            return Core.Structure.buildPivotGroupSymmetry(m, p.radius, Generators.residues(id).compile());
        },
        queryParams: [
            { name: "entityId", type: QueryParamType.String },
            { name: "asymId", type: QueryParamType.String },
            { name: "authAsymId", type: QueryParamType.String },
            { name: "name", type: QueryParamType.String },
            { name: "authName", type: QueryParamType.String },
            { name: "insCode", type: QueryParamType.String },
            { name: "seqNumber", type: QueryParamType.Integer },
            { name: "authSeqNumber", type: QueryParamType.Integer },
            {
                name: "radius", type: QueryParamType.Float, defaultValue: 5,
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
            return Generators.everything();
        },
        modelTransform: function (p, m) {
            return Core.Structure.buildSymmetryMates(m, p.radius);
        },
        queryParams: [
            {
                name: "radius", type: QueryParamType.Float, defaultValue: 5,
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
        description: "Constructs assembly with the given radius.",
        query: function (p, m) {
            return Generators.everything();
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
            { name: "id", type: QueryParamType.String, required: true }
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
function filterQueryParams(p, query) {
    var ret = {};
    for (var _i = 0, _a = Object.keys(p); _i < _a.length; _i++) {
        var key = _a[_i];
        if (!query.paramMap.has(key))
            continue;
        var info = query.paramMap.get(key);
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
    for (var _b = 0, _c = query.queryParams; _b < _c.length; _b++) {
        var prm = _c[_b];
        if (ret[prm.name] === undefined) {
            if (prm.required) {
                throw "The parameter '" + prm.name + "' is required.";
            }
            ret[prm.name] = prm.defaultValue;
        }
    }
    return ret;
}
exports.filterQueryParams = filterQueryParams;
