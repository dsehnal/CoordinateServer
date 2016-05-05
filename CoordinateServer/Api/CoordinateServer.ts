/*
 * Copyright (c) 2016 David Sehnal
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
import * as CifWriters from '../Writers/CifWriter'
import * as Molecule from '../Data/Molecule'

import { ApiQuery, CommonQueryParams } from './Queries'

import Logger from '../Utils/Logger';

import Cif = Core.Formats.Cif;
import Queries = Core.Structure.Query;

export class CoordinateServerConfig {
    commonParams: CommonQueryParams;
    includedCategories: string[];
    writer: CifWriters.ICifWriter;
}

export interface CoordinateServerResult {
    error?: string;
    errorCif?: string;

    timeQuery?: number;
    timeSerialize?: number;
    data?: { writeTo: (stream: { write: (str: string) => boolean }) => void };
}

export class CoordinateServer {
    
    static process(
        reqId: string,
        molecule: Molecule.Molecule,

        query: ApiQuery,
        queryParams: any,

        config: CoordinateServerConfig,
        next: (result: CoordinateServerResult) => void) {
        
        let perf = new Core.Utils.PerformanceMonitor();
        let writerConfig = new CifWriters.CifWriterConfig();
        writerConfig.type = query.name;
        writerConfig.params = Object.keys(queryParams).map(p => ({ name: p, value: queryParams[p] }));
        writerConfig.commonParams = config.commonParams;
        writerConfig.includedCategories = config.includedCategories;

        try {

            let models: CifWriters.IWritableFragments[] = [];

            perf.start('query')
            let found = 0;
            let singleModel = !!config.commonParams.modelId;
            let singleModelId = config.commonParams.modelId;
            let foundModel = false;
            for (var modelWrap of molecule.models) {

                let fragments: Queries.FragmentSeq;
                let model = modelWrap.model;

                if (singleModel && model.modelId !== singleModelId) continue;
                foundModel = true;

                if (query.description.modelTransform) {
                    let transformed = query.description.modelTransform(queryParams, model);
                    let compiled = query.description.query(queryParams, model, transformed).compile();
                    fragments = compiled(transformed.queryContext);
                    model = transformed;
                } else {
                    let compiled = query.description.query(queryParams, model, model).compile();
                    fragments = compiled(model.queryContext);
                }
                
                if (fragments.length > 0) {
                    models.push({ model, fragments });
                    found += fragments.length;
                }
            }
            perf.end('query');

            if (singleModelId && !foundModel) {
                let err = `Model with id '${singleModelId}' was not found.`;
                next({
                    error: err,
                    errorCif: config.writer.writeError(molecule.molecule.id, err, writerConfig)
                });
                return;
            }

            Logger.log(`${reqId}: Found ${found} fragment(s).`)

            perf.start('serialize');
            let data = config.writer.writeFragment(molecule.cif, models, writerConfig);
            perf.end('serialize');

            next({
                data,
                timeQuery: perf.time('query'),
                timeSerialize: perf.time('serialize')
            });
        } catch (e) {
            next({
                error: '' + e,
                errorCif: config.writer.writeError(molecule.molecule.id, '' + e, writerConfig)
            });
        }
    }
}