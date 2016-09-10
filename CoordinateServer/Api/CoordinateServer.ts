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
import * as WriterContext from '../Writers/Context'
import * as Molecule from '../Data/Molecule'

import { ApiQuery, FilteredQueryParams } from './Queries'

import Logger from '../Utils/Logger';

import Queries = Core.Structure.Query;

export interface CoordinateServerConfig {
    params: FilteredQueryParams,
    includedCategories: string[],
    writer: WriterContext.Writer
}

export interface CoordinateServerResult {
    error?: string;

    timeQuery?: number;
    timeFormat?: number;
}

export class CoordinateServer {
    
    static process(
        reqId: string,
        molecule: Molecule.Molecule,

        query: ApiQuery,
        queryParams: FilteredQueryParams,

        formatter: WriterContext.Formatter,

        config: CoordinateServerConfig,
        next: (result: CoordinateServerResult) => void) {
        
        let perf = new Core.Utils.PerformanceMonitor();

        let formatConfig: WriterContext.FormatConfig = {
            queryType: query.name,
            data: molecule.cif,
            includedCategories: config.includedCategories,
            params: queryParams
        };
        
        try {

            let models: WriterContext.WritableFragments[] = [];

            perf.start('query')
            let found = 0;
            let singleModel = !!queryParams.common.modelId;
            let singleModelId = queryParams.common.modelId;
            let foundModel = false;
            for (var modelWrap of molecule.models) {

                let fragments: Queries.FragmentSeq;
                let model = modelWrap.model;

                if (singleModel && model.modelId !== singleModelId) continue;
                foundModel = true;

                if (query.description.modelTransform) {
                    let transformed = query.description.modelTransform(queryParams, model);
                    let compiled = query.description.query(queryParams.query, model, transformed).compile();
                    fragments = compiled(transformed.queryContext);
                    model = transformed;
                } else {
                    let compiled = query.description.query(queryParams.query, model, model).compile();
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
                });
                return;
            }

            Logger.log(`${reqId}: Found ${found} fragment(s).`)

            perf.start('format');
            formatter(config.writer, formatConfig, models);
            perf.end('format');

            next({
                timeQuery: perf.time('query'),
                timeFormat: perf.time('format')
            });
        } catch (e) {
            next({
                error: '' + e,
            });
        }
    }
}