
import Logger from '../Utils/Logger';

import * as Core from 'LiteMol-core';
import * as CifWriters from '../Writers/CifWriter'

import ApiVersion from './Version'

import Queries = Core.Structure.Queries;
import Generators = Queries.Generators;

export enum QueryParamType {
    String,
    Integer,
    Float
}

export interface QueryParamInfo {
    name: string;
    type: QueryParamType;
    required?: boolean;
    defaultValue?: any;
    validation?: (v: any) => void;
}

export interface ApiQueryDescription {
    query: (params: any, originalModel: Core.Structure.MoleculeModel, transformedModel: Core.Structure.MoleculeModel) => Queries.IQueryBuilder;
    description: string;
    queryParams?: QueryParamInfo[];
    paramMap?: Map<string, QueryParamInfo>;
    modelTransform?: (params: any, m: Core.Structure.MoleculeModel) => Core.Structure.MoleculeModel;
    writer?: CifWriters.ICifWriter;
    includedCategories?: string[];
}

export interface ApiQuery {
    name: string;
    description: ApiQueryDescription;
}

export const DefaultCategories = [
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


const SymmetryCategories = [
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

export interface CommonQueryParams {
    atomSitesOnly: string;
}

const commonQueryParams: QueryParamInfo[] = [
    { name: "atomSitesOnly", type: QueryParamType.Integer, defaultValue: 0 },
];

export const QueryMap: { [id: string]: ApiQueryDescription } = {
    "het": { query: () => Generators.hetGroups(), description: "All non-water 'HETATM' records." },
    "cartoon": { query: () => Generators.cartoons(), description: "Atoms necessary to construct cartoons representation of the molecule (atoms named CA, O, O5', C3', N3 from polymer entities)." },
    "backbone": { query: () => Generators.backbone(), description: "Atoms named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C5' from polymer entities." },
    "sidechain": { query: () => Generators.sidechain(), description: "Atoms not named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C5' from polymer entities." },
    "water": { query: () => Generators.entities({ type: 'water' }), description: "Atoms from entities with type water." },
    "entities": {
        description: "Entities that satisfy the given parameters.",
        query: p => Generators.entities(p),
        queryParams: [
            { name: "entityId", type: QueryParamType.String },
            { name: "type", type: QueryParamType.String }
        ]
    },
    "chains": {
        description: "Chains that satisfy the given parameters.",
        query: p => Generators.chains(p),
        queryParams: [
            { name: "entityId", type: QueryParamType.String },
            { name: "asymId", type: QueryParamType.String },
            { name: "authAsymId", type: QueryParamType.String }
        ]
    },
    "residues": {
        description: "Residues that satisfy the given parameters.",
        query: p => Generators.residues(p),
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
        query: (p, m) => {
            let id = Core.Utils.shallowClone(p);
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
                validation(v: any) {
                    if (v < 1 || v > 10) {
                        throw `Invalid radius for ligand interaction query (must be a value between 1 and 10).`;
                    }
                }
            },
        ]
    },
    "ligandInteraction": {
        description: "Identifies symmetry mates and returns the specified atom set and all residues within the given radius.",
        query: (p, m) => {
            
            let chains = Generators.chains.apply(null, m.chains.asymId.map(x => { return { asymId: x } })),
                id = Core.Utils.shallowClone(p);
            delete id.radius;
            return Generators.residues(id).inside(chains).ambientResidues(p.radius).wholeResidues();
        },
        modelTransform: (p, m) => {
            let id = Core.Utils.shallowClone(p);
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
                validation(v: any) {
                    if (v < 1 || v > 10) {
                        throw `Invalid radius for ligand interaction query (must be a value between 1 and 10).`;
                    }
                }
            },
        ],
        includedCategories: SymmetryCategories
    },
    "symmetryMates": {
        description: "Identifies symmetry mates within the given radius.",
        query: (p, m) => {
            return Generators.everything();
        },
        modelTransform: (p, m) => {
            return Core.Structure.buildSymmetryMates(m, p.radius);
        },
        queryParams: [           
            {
                name: "radius", type: QueryParamType.Float, defaultValue: 5,
                validation(v: any) {
                    if (v < 1 || v > 50) {
                        throw `Invalid radius for symmetry mates query (must be a value between 1 and 50).`;
                    }
                }
            },
        ],
        includedCategories: SymmetryCategories
    },
    "assembly": {
        description: "Constructs assembly with the given radius.",
        query: (p, m) => {
            return Generators.everything();
        },
        modelTransform: (p, m) => {
            
            if (!m.assemblyInfo) throw 'Assembly info not present';

            let assembly = m.assemblyInfo.assemblies.filter(a => a.name.toLowerCase() === p.id);
            if (!assembly.length) throw `Assembly with the id '${p.id}' not found`;

            return Core.Structure.buildAssembly(m, assembly[0]);
        },
        queryParams: [
            { name: "id", type: QueryParamType.String, required: true }
        ],
        includedCategories: SymmetryCategories
    }
};

export const QueryList = (function () {
    let list: ApiQuery[] = [];
    for (let k of Object.keys(QueryMap)) list.push({ name: k, description: QueryMap[k] });
    list.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0 });
    return list;
})();

// normalize the queries
(function () {
    for (let q of QueryList) {

        let m = q.description;

        let paramMap = new Map<string, { name: string; type: QueryParamType }>();
        m.queryParams = m.queryParams || [];
        for (let p of m.queryParams) {
            paramMap.set(p.name, p);
        }
        m.paramMap = paramMap;
    }
})();

export function filterQueryParams(p: { [p: string]: string }, query: ApiQueryDescription):
    { [p: string]: string | number | boolean } {
        
    let ret: any = {};
    for (let key of Object.keys(p)) {

        if (!query.paramMap.has(key)) continue;

        let info = query.paramMap.get(key);

        if (p[key] !== undefined && p[key] !== null && p[key]['length'] === 0) {
            continue;
        }

        switch (info.type) {
            case QueryParamType.String: ret[key] = p[key]; break;
            case QueryParamType.Integer: ret[key] = parseInt(p[key]); break;
            case QueryParamType.Float: ret[key] = parseFloat(p[key]); break;
        }

        if (info.validation) info.validation(ret[key]);
    }

    for (let prm of query.queryParams) {
        if (ret[prm.name] === undefined) {
            if (prm.required) {
                throw `The parameter '${prm.name}' is required.`;
            }
            ret[prm.name] = prm.defaultValue;
        }
    }

    return ret;
}

let docs = undefined;

export function getHTMLDocs(appPrefix: string) {
    if (docs) return docs;
    return (docs = createDocumentationHTML(appPrefix));
}

function createDocumentationHTML(appPrefix: string) {
    let html: string[] = [];

    html.push(
        `<!DOCTYPE html>`,
        `<html xmlns="http://www.w3.org/1999/xhtml">`,
        `<head>`,
        `<meta charset="utf-8" />`,
        `<title>LiteMol Coordinate Server (${ApiVersion}, core ${Core.VERSION.number} - ${Core.VERSION.date}, node ${process.version})</title>`,
        `<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">`,
        `<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css" integrity="sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r" crossorigin="anonymous">`,
        //`<style> h2 { margin-bottom: 5px } </style>`,
        `</head>`,
        `<body>`,
        `<div class="container">`
    );

    html.push(`<h1>LiteMol Coordinate Server <small>${ApiVersion}, core ${Core.VERSION.number} - ${Core.VERSION.date}, node ${process.version}</small></h1>`);
    html.push("<hr>");

    html.push(QueryList.map(q => `<a href="#${q.name}">${q.name}</a>`).join(` | `));

    html.push("<hr>");

    html.push("<i>Note:</i><br/>");
    html.push("Empty-string values of parameters are ignored by the server, e.g. <code>/entities?entityId=&type=water</code> is the same as <code>/entities?type=water</code>.")

    html.push("<hr>");

    for (let entry of QueryList) {
        let id = entry.name;
        let q = entry.description;

        html.push(`<a name="${id}"></a>`)
        html.push(`<h2>${id}</h2>`);
        html.push(`<i>${q.description}</i><br/>`);
        
        let url = "",
            params = q.queryParams.concat(commonQueryParams);

        if (params.length > 0) {
            html.push(`<br/>`, `<ul>`);
            for (let p of params) {
                html.push(`<li><b>${p.name}</b> [ ${QueryParamType[p.type]} ] <i>Default value:</i> ${p.defaultValue === undefined ? 'n/a' : p.defaultValue} </li>`);
            }
            html.push(`</ul>`);

            url = `${appPrefix}/pdbid/${id}?${params.map(p => p.name + "=").join('&')}`;
        } else {
            url = `${appPrefix}/pdbid/${id}`;
        }
        html.push(`<a href="${url}" title="Fill in the desired values. Empty-string parameters are ignored by the server." target="_blank"><code>${url}</code></a>`);

        html.push(`<div style='color: #424242; margin-top: 10px'><small style='color: #424242'><b>Included categories:</b><br/>${(q.includedCategories || DefaultCategories).concat('_atom_site').join(', ')}</small></div>`);

        html.push(`<hr>`);
    }


    html.push(
        `</div>`,
        `</body>`,
        `</html>`);

    return html.join('\n');
}