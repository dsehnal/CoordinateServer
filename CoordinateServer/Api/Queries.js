"use strict";
var Core = require('LiteMol-core');
var Version_1 = require('./Version');
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
var commonQueryParams = [
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
var docs = undefined;
function getHTMLDocs(appPrefix) {
    if (docs)
        return docs;
    return (docs = createDocumentationHTML(appPrefix));
}
exports.getHTMLDocs = getHTMLDocs;
function createDocumentationHTML(appPrefix) {
    var html = [];
    html.push("<!DOCTYPE html>", "<html xmlns=\"http://www.w3.org/1999/xhtml\">", "<head>", "<meta charset=\"utf-8\" />", "<title>LiteMol Coordinate Server (" + Version_1.default + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ", node " + process.version + ")</title>", "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css\" integrity=\"sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7\" crossorigin=\"anonymous\">", "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css\" integrity=\"sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r\" crossorigin=\"anonymous\">", 
    //`<style> h2 { margin-bottom: 5px } </style>`,
    "</head>", "<body>", "<div class=\"container\">");
    html.push("<h1>LiteMol Coordinate Server <small>" + Version_1.default + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ", node " + process.version + "</small></h1>");
    html.push("<hr>");
    html.push(exports.QueryList.map(function (q) { return ("<a href=\"#" + q.name + "\">" + q.name + "</a>"); }).join(" | "));
    html.push("<hr>");
    html.push("<i>Note:</i><br/>");
    html.push("Empty-string values of parameters are ignored by the server, e.g. <code>/entities?entityId=&type=water</code> is the same as <code>/entities?type=water</code>.");
    html.push("<hr>");
    for (var _i = 0, QueryList_2 = exports.QueryList; _i < QueryList_2.length; _i++) {
        var entry = QueryList_2[_i];
        var id = entry.name;
        var q = entry.description;
        html.push("<a name=\"" + id + "\"></a>");
        html.push("<h2>" + id + "</h2>");
        html.push("<i>" + q.description + "</i><br/>");
        var url = "", params = q.queryParams.concat(commonQueryParams);
        if (params.length > 0) {
            html.push("<br/>", "<ul>");
            for (var _a = 0, params_1 = params; _a < params_1.length; _a++) {
                var p = params_1[_a];
                html.push("<li><b>" + p.name + "</b> [ " + QueryParamType[p.type] + " ] <i>Default value:</i> " + (p.defaultValue === undefined ? 'n/a' : p.defaultValue) + " </li>");
            }
            html.push("</ul>");
            url = appPrefix + "/pdbid/" + id + "?" + params.map(function (p) { return p.name + "="; }).join('&');
        }
        else {
            url = appPrefix + "/pdbid/" + id;
        }
        html.push("<a href=\"" + url + "\" title=\"Fill in the desired values. Empty-string parameters are ignored by the server.\" target=\"_blank\"><code>" + url + "</code></a>");
        html.push("<div style='color: #424242; margin-top: 10px'><small style='color: #424242'><b>Included categories:</b><br/>" + (q.includedCategories || exports.DefaultCategories).concat('_atom_site').join(', ') + "</small></div>");
        html.push("<hr>");
    }
    html.push("</div>", "</body>", "</html>");
    return html.join('\n');
}
