////import * as ApiCommands from './Api/Queries'
////import * as Api__ from './Api/Api'
////import ServerConfig from './ServerConfig';
////import Logger from './Utils/Logger';
////import * as Core from 'LiteMol-core';
////import { CoordinateServerConfig, CoordinateServer } from './CoordinateServer';
////import * as CifWriters from './Writers/CifWriter'
////import CifStringWriter from './Writers/CifStringWriter'
////import Queries = Core.Structure.Queries;
////import Generators = Queries.Generators;
////import ApiVersion from './Api/Version'
////import * as express from 'express';
////enum QueryParamType {
////    String,
////    Integer,
////    Float
////}
////interface QueryParamInfo {
////    name: string;
////    type: QueryParamType;
////    required?: boolean;
////    defaultValue?: any;
////    validation?: (v: any) => void;
////}
////interface QueryMapEntry {
////    query: (params: any, originalModel: Core.Structure.MoleculeModel, transformedModel: Core.Structure.MoleculeModel) => Queries.IQueryBuilder;
////    description: string;
////    queryParams?: QueryParamInfo[];
////    paramMap?: Map<string, QueryParamInfo>;
////    modelTransform?: (params: any, m: Core.Structure.MoleculeModel) => Core.Structure.MoleculeModel;
////    writer?: CifWriters.ICifWriter;
////    includedCategories?: string[];
////}
////export const DefaultCategories = [
////    '_entry',
////    '_entity',
////    '_struct_conf',
////    '_struct_sheet_range',
////    '_pdbx_struct_assembly',
////    '_pdbx_struct_assembly_gen',
////    '_pdbx_struct_oper_list',
////    '_cell',
////    '_symmetry',
////    '_entity_poly',
////    '_struct_asym',
////    '_pdbx_struct_mod_residue',
////    '_chem_comp_bond',
////    '_atom_sites'
////];
////let symmetryCategories = [
////    '_entry',
////    '_entity',
////    '_cell',
////    '_symmetry',
////    '_struct_conf',
////    '_struct_sheet_range',
////    '_entity_poly',
////    '_struct_asym',
////    '_pdbx_struct_mod_residue',
////    '_chem_comp_bond',
////    '_atom_sites'
////];
////let commonQueryParams: QueryParamInfo[] = [
////    { name: "atomSitesOnly", type: QueryParamType.Integer, defaultValue: 0 },
////];
////let queryMap: { [id: string]: QueryMapEntry } = {
////    "het": { query: () => Generators.hetGroups(), description: "All non-water 'HETATM' records." },
////    "cartoon": { query: () => Generators.cartoons(), description: "Atoms necessary to construct cartoons representation of the molecule (atoms named CA, O, O5', C3', N3 from polymer entities)." },
////    "backbone": { query: () => Generators.backbone(), description: "Atoms named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C5' from polymer entities." },
////    "sidechain": { query: () => Generators.sidechain(), description: "Atoms not named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C5' from polymer entities." },
////    "water": { query: () => Generators.entities({ type: 'water' }), description: "Atoms from entities with type water." },
////    "entities": {
////        description: "Entities that satisfy the given parameters.",
////        query: p => Generators.entities(p),
////        queryParams: [
////            { name: "entityId", type: QueryParamType.String },
////            { name: "type", type: QueryParamType.String }
////        ]
////    },
////    "chains": {
////        description: "Chains that satisfy the given parameters.",
////        query: p => Generators.chains(p),
////        queryParams: [
////            { name: "entityId", type: QueryParamType.String },
////            { name: "asymId", type: QueryParamType.String },
////            { name: "authAsymId", type: QueryParamType.String }
////        ]
////    },
////    "residues": {
////        description: "Residues that satisfy the given parameters.",
////        query: p => Generators.residues(p),
////        queryParams: [
////            { name: "entityId", type: QueryParamType.String },
////            { name: "asymId", type: QueryParamType.String },
////            { name: "authAsymId", type: QueryParamType.String },
////            { name: "name", type: QueryParamType.String },
////            { name: "authName", type: QueryParamType.String },
////            { name: "insCode", type: QueryParamType.String },
////            { name: "seqNumber", type: QueryParamType.Integer },
////            { name: "authSeqNumber", type: QueryParamType.Integer }
////        ]
////    },
////    "ligandInteraction": {
////        description: "Identifies symmetry mates and returns the specified atom set and all residues within the given radius.",
////        query: (p, m) => {
////            let chains = Generators.chains.apply(null, m.chains.asymId.map(x => { return { asymId: x } })),
////                id = Core.Utils.extend({}, p, {});
////            delete id.radius;
////            return Generators.residues(id).inside(chains).ambientResidues(p.radius).wholeResidues();
////        },
////        modelTransform: (p, m) => {
////            let id = Core.Utils.extend({}, p, {});
////            delete id.radius;
////            return Core.Structure.buildPivotGroupSymmetry(m, p.radius, Generators.residues(id).compile());
////        },
////        queryParams: [
////            { name: "entityId", type: QueryParamType.String },
////            { name: "asymId", type: QueryParamType.String },
////            { name: "authAsymId", type: QueryParamType.String },
////            { name: "name", type: QueryParamType.String },
////            { name: "authName", type: QueryParamType.String },
////            { name: "insCode", type: QueryParamType.String },
////            { name: "seqNumber", type: QueryParamType.Integer },
////            { name: "authSeqNumber", type: QueryParamType.Integer },
////            {
////                name: "radius", type: QueryParamType.Float, defaultValue: 5,
////                validation(v: any) {
////                    if (v < 1 || v > 10) {
////                        throw `Invalid radius for ligand interaction query (must be a value between 1 and 10).`;
////                    }
////                }
////            },
////        ],
////        includedCategories: symmetryCategories
////    },
////    "symmetryMates": {
////        description: "Identifies symmetry mates within the given radius.",
////        query: (p, m) => {
////            return Generators.everything();
////        },
////        modelTransform: (p, m) => {
////            return Core.Structure.buildSymmetryMates(m, p.radius);
////        },
////        queryParams: [           
////            {
////                name: "radius", type: QueryParamType.Float, defaultValue: 5,
////                validation(v: any) {
////                    if (v < 1 || v > 50) {
////                        throw `Invalid radius for symmetry mates query (must be a value between 1 and 50).`;
////                    }
////                }
////            },
////        ],
////        includedCategories: symmetryCategories
////    },
////    "assembly": {
////        description: "Constructs assembly with the given radius.",
////        query: (p, m) => {
////            return Generators.everything();
////        },
////        modelTransform: (p, m) => {
////            if (!m.assemblyInfo) throw 'Assembly info not present';
////            let assembly = m.assemblyInfo.assemblies.filter(a => a.name.toLowerCase() === p.id);
////            if (!assembly.length) throw `Assembly with the id '${p.id}' not found`;
////            return Core.Structure.buildAssembly(m, assembly[0]);
////        },
////        queryParams: [
////            { name: "id", type: QueryParamType.String, required: true }
////        ],
////        includedCategories: symmetryCategories
////    },
////    ////"ligandSymmetryPivots": {
////    ////    query: (p, m) => {
////    ////        return Generators.residues().union();
////    ////    },
////    ////    modelTransform: (p, m) => {
////    ////        let id = Core.Utils.extend({}, p, {});
////    ////        delete id.radius;
////    ////        return Core.Structure.buildPivotGroupSymmetry(m, p.radius, Generators.residues(id).compile());
////    ////    },
////    ////    writer: new CifWriters.SymmetryCifWriter(),
////    ////    queryParams: [
////    ////        { name: "entityId", type: QueryParamType.String },
////    ////        { name: "asymId", type: QueryParamType.String },
////    ////        { name: "authAsymId", type: QueryParamType.String },
////    ////        { name: "name", type: QueryParamType.String },
////    ////        { name: "authName", type: QueryParamType.String },
////    ////        { name: "insCode", type: QueryParamType.String },
////    ////        { name: "seqNumber", type: QueryParamType.Integer },
////    ////        { name: "authSeqNumber", type: QueryParamType.Integer },
////    ////        {
////    ////            name: "radius", type: QueryParamType.Float, defaultValue: 5,
////    ////            validation(v: any) {
////    ////                if (v < 1 || v > 10) {
////    ////                    throw `Invalid radius for ligand interaction query (must be a value between 1 and 10).`;
////    ////                }
////    ////            }
////    ////        },
////    ////    ],
////    ////    includedCategories: [
////    ////        '_entry',
////    ////        '_entity',
////    ////        '_cell',
////    ////        '_symmetry',
////    ////        '_atom_sites',
////    ////        '_chem_comp_bond'
////    ////    ]
////    ////},
////};
////export default class Api {
////    private static makePath(p: string) {
////        return ServerConfig.appPrefix + '/' + p;
////    }
////    private filterQueryParams(p: any, entry: QueryMapEntry): any {
////        let ret: any = {};
////        for (let key of Object.keys(p)) {
////            if (!entry.paramMap.has(key)) continue;
////            let info = entry.paramMap.get(key);
////            if (p[key] !== undefined && p[key] !== null && p[key]['length'] === 0) {
////                continue;
////            }
////            switch (info.type) {
////                case QueryParamType.String: ret[key] = p[key]; break;
////                case QueryParamType.Integer: ret[key] = parseInt(p[key]); break;
////                case QueryParamType.Float: ret[key] = parseFloat(p[key]); break;
////            }
////            if (info.validation) info.validation(ret[key]);
////        }
////        for (let prm of entry.queryParams) {
////            if (ret[prm.name] === undefined) {
////                if (prm.required) {
////                    throw `The parameter '${prm.name}' is required.`;
////                }
////                ret[prm.name] = prm.defaultValue;
////            }
////        }
////        return ret;
////    }
////    private querySerial = 0;
////    private mapQuery(type: string, entry: QueryMapEntry) {
////        this.app.get(Api.makePath(':id/' + type), (req, res) => {
////            this.querySerial++;
////            let reqId = `'${this.querySerial}:${req.params.id}/${type}'`;
////            Logger.log(`${reqId}: Processing.`);
////            let config = new CoordinateServerConfig();
////            config.atomSitesOnly = !!req.query.atomSitesOnly,
////            config.includedCategories = entry.includedCategories ? entry.includedCategories : DefaultCategories;
////            config.writer = entry.writer ? entry.writer : new CifWriters.DefaultCifWriter();
////            config.apiVersion = ApiVersion;
////            let performance = new Core.Utils.PerformanceMonitor();
////            let params: any,
////                modelTransform = entry.modelTransform ? entry.modelTransform : (p: any, m: any) => m;
////            try {
////                params = this.filterQueryParams(req.query, entry)
////            } catch (e) {
////                res.writeHead(200, {
////                    'Content-Type': 'text/plain; charset=utf-8',
////                    'Access-Control-Allow-Origin': '*',
////                    'Access-Control-Allow-Headers': 'X-Requested-With'
////                });
////                Logger.log(`${reqId}: Query params error: ${e}`);
////                let wcfg = new CifWriters.CifWriterConfig();
////                wcfg.apiVersion = ApiVersion;
////                wcfg.atomSitesOnly = config.atomSitesOnly;
////                wcfg.type = type;
////                let msg = config.writer.writeError(req.params.id, '' + e, wcfg);
////                res.end(msg);
////                return;
////            }
////            Logger.log(`${reqId}: Query params ${JSON.stringify(params)}`);
////            performance.start('total');
////            CoordinateServer.process(
////                type,
////                reqId,
////                req.params.id,
////                modelTransform,
////                params,
////                entry.query,
////                config,
////                performance,
////                (err, data) => {
////                    if (err) {
////                        if (err.is404) {
////                            Logger.error(`${reqId}: Failed. (${err.error})`);
////                            res.writeHead(404);
////                            res.end();
////                        } else {
////                            Logger.error(`${reqId}: Failed. (${err.error})`);
////                            res.writeHead(200, {
////                                'Content-Type': 'text/plain; charset=utf-8',
////                                'Access-Control-Allow-Origin': '*',
////                                'Access-Control-Allow-Headers': 'X-Requested-With'
////                            });
////                            res.end(err.cif);
////                        }
////                        return;
////                    } else {
////                        res.writeHead(200, {
////                            'Content-Type': 'text/plain; charset=utf-8',
////                            'Access-Control-Allow-Origin': '*',
////                            'Access-Control-Allow-Headers': 'X-Requested-With'
////                        });
////                        data.writeTo(res);
////                        res.end();
////                    }
////                    performance.end('write');
////                    performance.end('total');
////                    Logger.log(`${reqId}: Done. (${performance.measure('total')}: io ${performance.measure('io')}, parse ${performance.measure('parse')}` +
////                        `, query ${performance.measure('query')}, write ${performance.measure('write')})`);
////                    //res.end(data);
////                });
////        });
////    }
////    private mapPdb() {
////        this.app.get(Api.makePath(':id/pdb'), (req, res) => {
////            CoordinateServer.processPdb(
////                req.params.id,
////                (err, data) => {
////                    if (err) {
////                        console.error(err);
////                        res.writeHead(404);
////                        res.end();
////                        return;
////                    }
////                    res.writeHead(200, {
////                        'Content-Type': 'text/plain; charset=utf-8',
////                        'Access-Control-Allow-Origin': '*',
////                        'Access-Control-Allow-Headers': 'X-Requested-With'
////                    });
////                    res.end(data);
////                });
////        });
////    }
////    constructor(private app: express.Express) {
////    }
////    init() {
////        this.mapPdb();
////        for (let type of Object.keys(queryMap)) {
////            let m = queryMap[type];
////            let paramMap = new Map<string, { name: string; type: QueryParamType }>();
////            m.queryParams = m.queryParams || [];
////            for (let p of m.queryParams) {
////                paramMap.set(p.name, p);
////            }
////            m.paramMap = paramMap;
////            this.mapQuery(type, m);
////        }
////    }
////    private __docs: string = "";
////    get documentationHTML() {
////        if (this.__docs.length > 0) return this.__docs;
////        this.__docs = Api.createDocumentationHTML();
////        return this.__docs;
////    }
////    private static createDocumentationHTML() {
////        let html:string[] = [];
////        html.push(
////            `<!DOCTYPE html>`,
////            `<html xmlns="http://www.w3.org/1999/xhtml">`,
////            `<head>`,
////            `<meta charset="utf-8" />`,
////            `<title>LiteMol Coordinate Server (${ApiVersion}, core ${Core.VERSION.number} - ${Core.VERSION.date}, node ${process.version})</title>`,
////            `<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">`,
////            `<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css" integrity="sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r" crossorigin="anonymous">`,
////            //`<style> h2 { margin-bottom: 5px } </style>`,
////            `</head>`,
////            `<body>`,
////            `<div class="container">`
////        );
////        html.push(`<h1>LiteMol Coordinate Server <small>${ApiVersion}, core ${Core.VERSION.number} - ${Core.VERSION.date}, node ${process.version}</small></h1>`);
////        html.push("<hr>");
////        html.push(Object.keys(queryMap).map(k => `<a href="#${k}">${k}</a>`).join(` | `));
////        html.push("<hr>");
////        html.push("<i>Note:</i><br/>");
////        html.push("Empty-string values of parameters are ignored by the server, e.g. <code>/entities?entityId=&type=water</code> is the same as <code>/entities?type=water</code>.")
////        html.push("<hr>");
////        for (let id in queryMap) {
////            let q = queryMap[id];
////            html.push(`<a name="${id}"></a>`)
////            html.push(`<h2>${id}</h2>`);
////            html.push(`<i>${q.description}</i><br/>`);
////            let url = "",
////                params = q.queryParams.concat(commonQueryParams);
////            if (params.length > 0) {
////                html.push(`<br/>`, `<ul>`);
////                for (let p of params) {
////                    html.push(`<li><b>${p.name}</b> [ ${QueryParamType[p.type]} ] <i>Default value:</i> ${p.defaultValue === undefined ? 'n/a' : p.defaultValue} </li>`);
////                }
////                html.push(`</ul>`);
////                url = `${ServerConfig.appPrefix}/pdbid/${id}?${params.map(p => p.name + "=").join('&')}`;
////            } else {
////                url = `${ServerConfig.appPrefix}/pdbid/${id}`;
////            }
////            html.push(`<a href="${url}" title="Fill in the desired values. Empty-string parameters are ignored by the server." target="_blank"><code>${url}</code></a>`);
////            html.push(`<div style='color: #424242; margin-top: 10px'><small style='color: #424242'><b>Included categories:</b><br/>${(q.includedCategories || DefaultCategories).concat('_atom_site').join(', ')}</small></div>`);
////            html.push(`<hr>`);
////        }
////        html.push(
////            `</div>`,
////            `</body>`,
////            `</html>`);
////        return html.join('\n');
////    }
////} 
