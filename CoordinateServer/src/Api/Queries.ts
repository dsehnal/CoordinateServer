
import Logger from '../Utils/Logger';

import * as Core from 'LiteMol-core';
import * as CifWriters from '../Writers/CifWriter'

import ApiVersion from './Version'

import Queries = Core.Structure.Query;

export enum QueryParamType {
    String,
    Integer,
    Float
}

export interface QueryParamInfo {
    name: string;
    type: QueryParamType;
    description?: string;
    required?: boolean;
    defaultValue?: any;
    validation?: (v: any) => void;
}

interface ApiQueryDefinition {
    query: (params: any, originalModel: Core.Structure.MoleculeModel, transformedModel: Core.Structure.MoleculeModel) => Queries.Builder;
    description: string;
    queryParams?: QueryParamInfo[];
    paramMap?: Map<string, QueryParamInfo>;
    modelTransform?: (params: any, m: Core.Structure.MoleculeModel) => Core.Structure.MoleculeModel;
    includedCategories?: string[];
}

export interface ApiQueryDescription {
    query: (params: any, originalModel: Core.Structure.MoleculeModel, transformedModel: Core.Structure.MoleculeModel) => Queries.Builder;
    description: string;
    queryParams: QueryParamInfo[];
    paramMap: Map<string, QueryParamInfo>;
    modelTransform?: (params: any, m: Core.Structure.MoleculeModel) => Core.Structure.MoleculeModel;
    includedCategories?: string[];
}

export interface ApiQuery {
    name: string;
    description: ApiQueryDescription;
}

export interface FilteredQueryParams {
    query: { [name: string]: string },
    common: CommonQueryParams
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
    atomSitesOnly: boolean;
    modelId: string;
    format: string;
    encoding: string;
    lowPrecisionCoords: boolean;
}

export const CommonQueryParamsInfo: QueryParamInfo[] = [
    { name: "modelId", type: QueryParamType.String, description: "If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field." },
    { name: "atomSitesOnly", type: QueryParamType.Integer, defaultValue: 0, description: "If 1, only the '_atom_site' category is returned." },
    { name: "format", type: QueryParamType.String, defaultValue: 'mmCIF', description: "Determines the output format (Currently supported: 'mmCIF')." },
    { name: "encoding", type: QueryParamType.String, defaultValue: 'cif', description: "Determines the output encoding (text based 'CIF' or binary 'BCIF')." },
    { name: "lowPrecisionCoords", type: QueryParamType.Integer, defaultValue: 0, description: "If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision)." }
];

export const CommonQueryParamsInfoMap = (function () {
    let map = new Map<string, QueryParamInfo>();
    CommonQueryParamsInfo.forEach(i => map.set(i.name, i));
    return map;
})();

const CommonParameters = {
    entityId: <QueryParamInfo>{ name: "entityId", type: QueryParamType.String, description: "Corresponds to the '_entity.id' or '*.label_entity_id' field, depending on the context." },

    asymId: <QueryParamInfo>{ name: "asymId", type: QueryParamType.String, description: "Corresponds to the '_atom_site.label_asym_id' field." },
    authAsymId: <QueryParamInfo>{ name: "authAsymId", type: QueryParamType.String, description: "Corresponds to the '_atom_site.auth_asym_id' field." },

    name: <QueryParamInfo>{ name: "name", type: QueryParamType.String, description: "Residue name. Corresponds to the '_atom_site.label_comp_id' field." },
    authName: <QueryParamInfo>{ name: "authName", type: QueryParamType.String, description: "Author residue name. Corresponds to the '_atom_site.auth_comp_id' field." },

    insCode: <QueryParamInfo>{ name: "insCode", type: QueryParamType.String, description: "Corresponds to the '_atom_site.pdbx_PDB_ins_code' field." },

    seqNumber: <QueryParamInfo>{ name: "seqNumber", type: QueryParamType.Integer, description: "Residue seq. number. Corresponds to the '_atom_site.label_seq_id' field." },
    authSeqNumber: <QueryParamInfo>{ name: "authSeqNumber", type: QueryParamType.Integer, description: "Author residue seq. number. Corresponds to the '_atom_site.auth_seq_id' field." },
};

const QueryMap: { [id: string]: ApiQueryDefinition } = {
    "full": { query: () => Queries.everything(), description: "The full structure." },
    "het": { query: () => Queries.hetGroups(), description: "All non-water 'HETATM' records." },
    "cartoon": { query: () => Queries.cartoons(), description: "Atoms necessary to construct cartoons representation of the molecule (atoms named CA, O, O5', C3', N3 from polymer entities) + HET atoms + water." },
    "backbone": { query: () => Queries.backbone(), description: "Atoms named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C4, C5' from polymer entities." },
    "sidechain": { query: () => Queries.sidechain(), description: "Atoms not named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C4, C5' from polymer entities." },
    "water": { query: () => Queries.entities({ type: 'water' }), description: "Atoms from entities with type water." },
    "entities": {
        description: "Entities that satisfy the given parameters.",
        query: p => Queries.entities(p),
        queryParams: [
            CommonParameters.entityId,
            { name: "type", type: QueryParamType.String, description: "Corresponds to the '_entity.type' field (polymer / non-polymer / water)." }
        ]
    },
    "chains": {
        description: "Chains that satisfy the given parameters.",
        query: p => Queries.chains(p),
        queryParams: [
            CommonParameters.entityId,
            CommonParameters.asymId,
            CommonParameters.authAsymId,
        ]
    },
    "residues": {
        description: "Residues that satisfy the given parameters.",
        query: p => Queries.residues(p),
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
        description: "Atoms named CA, O5', C3', N3 from polymer entities + optionally HET and/or water atoms.",
        query: (p) => {
            let parts = [Queries.polymerTrace('CA', `O5'`, `C3'`, 'N3')];
            if (!!p.het) parts.push(Queries.hetGroups());
            if (!!p.water) parts.push(Queries.entities({ type: 'water' }));
            return Queries.or.apply(null, parts).union();
        },
        queryParams: [
            <QueryParamInfo>{ name: "het", type: QueryParamType.Integer, defaultValue: 0, description: "If 1, include HET atoms." },
            <QueryParamInfo>{ name: "water", type: QueryParamType.Integer, defaultValue: 0, description: "If 1, include water atoms." }
        ]
    },
    "ambientResidues": {
        description: "Identifies all residues within the given radius from the source residue.",
        query: (p, m) => {
            let id = Core.Utils.extend({}, p);
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
            
            let chains = Queries.chains.apply(null, m.chains.asymId.map(x => { return { asymId: x } })),
                id = Core.Utils.extend({}, p);
            delete id.radius;
            return Queries.residues(id).inside(chains).ambientResidues(p.radius).wholeResidues();
        },
        modelTransform: (p, m) => {
            let id = Core.Utils.extend({}, p);
            delete id.radius;
            let symm = Core.Structure.buildPivotGroupSymmetry(m, p.radius, Queries.residues(id).compile());
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
                description: "Value in Angstroms.",
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
            return Queries.everything();
        },
        modelTransform: (p, m) => {
            return Core.Structure.buildSymmetryMates(m, p.radius);
        },
        queryParams: [           
            {
                name: "radius",
                type: QueryParamType.Float,
                defaultValue: 5,
                description: "Value in Angstroms.",
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
        description: "Constructs assembly with the given id.",
        query: (p, m) => {
            return Queries.everything();
        },
        modelTransform: (p, m) => {
            
            if (!m.assemblyInfo) throw 'Assembly info not present';

            let assembly = m.assemblyInfo.assemblies.filter(a => a.name.toLowerCase() === p.id);
            if (!assembly.length) throw `Assembly with the id '${p.id}' not found`;

            return Core.Structure.buildAssembly(m, assembly[0]);
        },
        queryParams: [
            { name: "id", type: QueryParamType.String, defaultValue: '1', description: "Corresponds to the '_pdbx_struct_assembly.id' field." }
        ],
        includedCategories: SymmetryCategories
    }
};

export function getQueryByName(name: string) {
    return <ApiQueryDescription>QueryMap[name];
}

export const QueryList = (function () {
    let list: ApiQuery[] = [];
    for (let k of Object.keys(QueryMap)) list.push({ name: k, description: <ApiQueryDescription>QueryMap[k] });
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


function _filterQueryParams(p: { [p: string]: string }, paramMap: Map<string, QueryParamInfo>, paramList: QueryParamInfo[]):
    { [p: string]: string | number | boolean } {

    let ret: any = {};
    for (let key of Object.keys(p)) {

        if (!paramMap.has(key)) continue;

        let info = paramMap.get(key)!;

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

    for (let prm of paramList) {
        if (ret[prm.name] === undefined) {
            if (prm.required) {
                throw `The parameter '${prm.name}' is required.`;
            }
            ret[prm.name] = prm.defaultValue;
        }
    }

    return ret;
}


export function filterQueryParams(p: { [p: string]: string }, query: ApiQueryDescription) {
    return _filterQueryParams(p, query.paramMap, query.queryParams);
}

export function filterCommonQueryParams(p: CommonQueryParams): CommonQueryParams {
    let r = (<any>_filterQueryParams(p as any, CommonQueryParamsInfoMap, CommonQueryParamsInfo)) as CommonQueryParams;
    r.atomSitesOnly = !!r.atomSitesOnly;
    r.lowPrecisionCoords = !!r.lowPrecisionCoords;
    return r;
}