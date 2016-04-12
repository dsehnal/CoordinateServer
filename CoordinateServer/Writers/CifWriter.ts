/*
 * Copyright (c) 2015 David Sehnal
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Core from 'LiteMol-core'
import StringWriter from './StringWriter'
import CifStringWriter from './CifStringWriter'
import CifCategoryWriters from './CifCategoryWriters'

export class CifWriterConfig {

    atomSitesOnly = false;
    includedCategories: string[] = [
        '_entry',
        '_entity',
        '_struct_conf',
        '_struct_sheet_range',
        '_pdbx_struct_assembly',
        '_pdbx_struct_assembly_gen',
        '_pdbx_struct_oper_list',
        '_cell',
        '_symmetry',
        '_atom_sites',
        '_chem_comp_bond'
    ];

    type = '?';
    apiVersion = '?';
    params: { name: string, value: any }[] = [];
}

export interface IWritableFragments {
    model: Core.Structure.MoleculeModel;
    fragments: Core.Structure.Queries.FragmentSeq
}


export interface ICifWriter {
    writeError(header: string, message: string, config: CifWriterConfig): string;
    writeFragment(data: Core.Formats.Cif.Block, models: IWritableFragments[], config: CifWriterConfig): StringWriter;
}

export class DefaultCifWriter implements ICifWriter {


    private writeParams(writer: CifStringWriter, params: { name: string, value: any }[]) {


        let ctx = params;
        let fields: CifCategoryWriters.FieldDesc<typeof ctx> = [
            { name: '_coordinate_server_query_params.name', src: (ctx, i) => ctx[i].name },
            { name: '_coordinate_server_query_params.value', src: (ctx, i) => ctx[i].value === undefined ? '.' : '' + ctx[i].value },
        ];
        
        CifCategoryWriters.writeRecords(fields, ctx, ctx.length, writer);
        if (ctx.length > 0) writer.write('#\n');
    }

    private writeResultHeader({ isEmpty, hasError }: { isEmpty: boolean, hasError: boolean }, config: CifWriterConfig, writer: CifStringWriter) {

        writer.write(`_coordinate_server_result.query_type         `); writer.writeChecked(config.type); writer.newline();
        writer.write(`_coordinate_server_result.datetime           `); writer.writeChecked(new Date().toLocaleString('us')); writer.newline();
        writer.write(`_coordinate_server_result.is_empty           ${isEmpty ? 'yes' : 'no'}`); writer.newline();
        writer.write(`_coordinate_server_result.has_error          ${hasError ? 'yes' : 'no'}`); writer.newline();
        writer.write(`_coordinate_server_result.atom_sites_only    ${config.atomSitesOnly ? 'yes' : 'no'}`); writer.newline();
        writer.write(`_coordinate_server_result.api_version        ${config.apiVersion}`); writer.newline();
        writer.write(`_coordinate_server_result.core_version       ${Core.VERSION.number}`); writer.newline();
        writer.write(`#\n`);
    }

    writeError(header: string, message: string, config: CifWriterConfig) {

        let writer = new CifStringWriter();

        writer.write(`data_${(header || '').replace(/[ \n\t]/g, '').toUpperCase()}\n#\n`);
        this.writeResultHeader({ isEmpty: true, hasError: true }, config, writer);
        
        let ctx = message;
        let fields: CifCategoryWriters.FieldDesc<typeof ctx> = [
            { name: '_coordinate_server_error.message', src: (ctx, i) => ctx }
        ];

        CifCategoryWriters.writeRecords(fields, ctx, 1, writer);
        writer.write('#\n');


        this.writeParams(writer, config.params);

        return writer.writer.asString();        
    }

    writeFragment(data: Core.Formats.Cif.Block, models: IWritableFragments[], config: CifWriterConfig) {

        let writer = new CifStringWriter();
        let included = config.includedCategories;

        writer.write(`data_${data.header}\n#\n`);
        
        let isEmpty = !models || !models.length || !models.some(m => m.fragments.length > 0);
        this.writeResultHeader({ isEmpty: isEmpty, hasError: false }, config, writer);

        this.writeParams(writer, config.params);

        if (isEmpty) {
            return writer.writer;
        }


        let unionFragment = models[0].fragments.unionFragment();
        let contents = new CifCategoryWriters.CifWriterContents(unionFragment, models[0].model, data);

        if (!config.atomSitesOnly) {

            if (!included) included = data.categoryList.map(c => c.name);
            for (let c of included) {
                let w = CifCategoryWriters.CategoryWriters[c];
                if (w) w(contents, writer);
            }
        }

        CifCategoryWriters.writeAtomSites(models, contents, writer);
        
        return writer.writer;    
    }
}