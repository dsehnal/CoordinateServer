"use strict";
var ServerConfig_1 = require('./ServerConfig');
var Logger_1 = require('./Utils/Logger');
var Core = require('LiteMol-core');
var CoordinateServer_1 = require('./CoordinateServer');
var CifWriters = require('./Writers/CifWriter');
var Queries = Core.Structure.Queries;
var Generators = Queries.Generators;
var QueryParamType;
(function (QueryParamType) {
    QueryParamType[QueryParamType["String"] = 0] = "String";
    QueryParamType[QueryParamType["Integer"] = 1] = "Integer";
    QueryParamType[QueryParamType["Float"] = 2] = "Float";
})(QueryParamType || (QueryParamType = {}));
var defaultCategories = [
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
var symmetryCategories = [
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
    { name: "atomSitesOnly", type: QueryParamType.Integer, defaultValue: 0 },
];
var queryMap = {
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
    "ligandInteraction": {
        description: "Identifies symmetry mates and returns the specified atom set and all residues within the given radius.",
        query: function (p, m) {
            var chains = Generators.chains.apply(null, m.chains.asymId.map(function (x) { return { asymId: x }; })), id = Core.Utils.extend({}, p, {});
            delete id.radius;
            return Generators.residues(id).inside(chains).ambientResidues(p.radius).wholeResidues();
        },
        modelTransform: function (p, m) {
            var id = Core.Utils.extend({}, p, {});
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
        includedCategories: symmetryCategories
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
        includedCategories: symmetryCategories
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
        includedCategories: symmetryCategories
    },
};
var Api = (function () {
    function Api(app) {
        this.app = app;
        this.querySerial = 0;
        this.__docs = "";
    }
    Api.makePath = function (p) {
        return ServerConfig_1.default.appPrefix + '/' + p;
    };
    Api.prototype.filterQueryParams = function (p, entry) {
        var ret = {};
        for (var _i = 0, _a = Object.keys(p); _i < _a.length; _i++) {
            var key = _a[_i];
            if (!entry.paramMap.has(key))
                continue;
            var info = entry.paramMap.get(key);
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
        for (var _b = 0, _c = entry.queryParams; _b < _c.length; _b++) {
            var prm = _c[_b];
            if (ret[prm.name] === undefined) {
                if (prm.required) {
                    throw "The parameter '" + prm.name + "' is required.";
                }
                ret[prm.name] = prm.defaultValue;
            }
        }
        return ret;
    };
    Api.prototype.mapQuery = function (type, entry) {
        var _this = this;
        this.app.get(Api.makePath(':id/' + type), function (req, res) {
            _this.querySerial++;
            var reqId = "'" + _this.querySerial + ":" + req.params.id + "/" + type + "'";
            Logger_1.default.log(reqId + ": Processing.");
            var config = new CoordinateServer_1.CoordinateServerConfig();
            config.atomSitesOnly = !!req.query.atomSitesOnly,
                config.includedCategories = entry.includedCategories ? entry.includedCategories : defaultCategories;
            config.writer = entry.writer ? entry.writer : new CifWriters.DefaultCifWriter();
            config.apiVersion = Api.VERSION;
            var performance = new Core.Utils.PerformanceMonitor();
            var params, modelTransform = entry.modelTransform ? entry.modelTransform : function (p, m) { return m; };
            try {
                params = _this.filterQueryParams(req.query, entry);
            }
            catch (e) {
                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'X-Requested-With'
                });
                Logger_1.default.log(reqId + ": Query params error: " + e);
                var wcfg = new CifWriters.CifWriterConfig();
                wcfg.apiVersion = Api.VERSION;
                wcfg.atomSitesOnly = config.atomSitesOnly;
                wcfg.type = type;
                var msg = config.writer.writeError(req.params.id, '' + e, wcfg);
                res.end(msg);
                return;
            }
            Logger_1.default.log(reqId + ": Query params " + JSON.stringify(params));
            performance.start('total');
            CoordinateServer_1.CoordinateServer.process(type, reqId, req.params.id, modelTransform, params, entry.query, config, performance, function (err, data) {
                if (err) {
                    if (err.is404) {
                        Logger_1.default.error(reqId + ": Failed. (" + err.error + ")");
                        res.writeHead(404);
                        res.end();
                    }
                    else {
                        Logger_1.default.error(reqId + ": Failed. (" + err.error + ")");
                        res.writeHead(200, {
                            'Content-Type': 'text/plain; charset=utf-8',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'X-Requested-With'
                        });
                        res.end(err.cif);
                    }
                    return;
                }
                else {
                    res.writeHead(200, {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'X-Requested-With'
                    });
                    data.writeTo(res);
                    res.end();
                }
                performance.end('write');
                performance.end('total');
                Logger_1.default.log((reqId + ": Done. (" + performance.measure('total') + ": io " + performance.measure('io') + ", parse " + performance.measure('parse')) +
                    (", query " + performance.measure('query') + ", write " + performance.measure('write') + ")"));
                //res.end(data);
            });
        });
    };
    Api.prototype.mapPdb = function () {
        this.app.get(Api.makePath(':id/pdb'), function (req, res) {
            CoordinateServer_1.CoordinateServer.processPdb(req.params.id, function (err, data) {
                if (err) {
                    console.error(err);
                    res.writeHead(404);
                    res.end();
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'X-Requested-With'
                });
                res.end(data);
            });
        });
    };
    Api.prototype.init = function () {
        this.mapPdb();
        for (var _i = 0, _a = Object.keys(queryMap); _i < _a.length; _i++) {
            var type = _a[_i];
            var m = queryMap[type];
            var paramMap = new Map();
            m.queryParams = m.queryParams || [];
            for (var _b = 0, _c = m.queryParams; _b < _c.length; _b++) {
                var p = _c[_b];
                paramMap.set(p.name, p);
            }
            m.paramMap = paramMap;
            this.mapQuery(type, m);
        }
    };
    Object.defineProperty(Api.prototype, "documentationHTML", {
        get: function () {
            if (this.__docs.length > 0)
                return this.__docs;
            this.__docs = Api.createDocumentationHTML();
            return this.__docs;
        },
        enumerable: true,
        configurable: true
    });
    Api.createDocumentationHTML = function () {
        var html = [];
        html.push("<!DOCTYPE html>", "<html xmlns=\"http://www.w3.org/1999/xhtml\">", "<head>", "<meta charset=\"utf-8\" />", "<title>LiteMol Coordinate Server (" + Api.VERSION + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ", node " + process.version + ")</title>", "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css\" integrity=\"sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7\" crossorigin=\"anonymous\">", "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css\" integrity=\"sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r\" crossorigin=\"anonymous\">", 
        //`<style> h2 { margin-bottom: 5px } </style>`,
        "</head>", "<body>", "<div class=\"container\">");
        html.push("<h1>LiteMol Coordinate Server <small>" + Api.VERSION + ", core " + Core.VERSION.number + " - " + Core.VERSION.date + ", node " + process.version + "</small></h1>");
        html.push("<hr>");
        html.push(Object.keys(queryMap).map(function (k) { return ("<a href=\"#" + k + "\">" + k + "</a>"); }).join(" | "));
        html.push("<hr>");
        html.push("<i>Note:</i><br/>");
        html.push("Empty-string values of parameters are ignored by the server, e.g. <code>/entities?entityId=&type=water</code> is the same as <code>/entities?type=water</code>.");
        html.push("<hr>");
        for (var id in queryMap) {
            var q = queryMap[id];
            html.push("<a name=\"" + id + "\"></a>");
            html.push("<h2>" + id + "</h2>");
            html.push("<i>" + q.description + "</i><br/>");
            var url = "", params = q.queryParams.concat(commonQueryParams);
            if (params.length > 0) {
                html.push("<br/>", "<ul>");
                for (var _i = 0, params_1 = params; _i < params_1.length; _i++) {
                    var p = params_1[_i];
                    html.push("<li><b>" + p.name + "</b> [ " + QueryParamType[p.type] + " ] <i>Default value:</i> " + (p.defaultValue === undefined ? 'n/a' : p.defaultValue) + " </li>");
                }
                html.push("</ul>");
                url = ServerConfig_1.default.appPrefix + "/pdbid/" + id + "?" + params.map(function (p) { return p.name + "="; }).join('&');
            }
            else {
                url = ServerConfig_1.default.appPrefix + "/pdbid/" + id;
            }
            html.push("<a href=\"" + url + "\" title=\"Fill in the desired values. Empty-string parameters are ignored by the server.\" target=\"_blank\"><code>" + url + "</code></a>");
            html.push("<div style='color: #424242; margin-top: 10px'><small style='color: #424242'><b>Included categories:</b><br/>" + (q.includedCategories || defaultCategories).concat('_atom_site').join(', ') + "</small></div>");
            html.push("<hr>");
        }
        html.push("</div>", "</body>", "</html>");
        return html.join('\n');
    };
    Api.VERSION = "1.1.5";
    return Api;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Api;
