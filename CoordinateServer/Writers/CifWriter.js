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
"use strict";
var Core = require('LiteMol-core');
var CifStringWriter_1 = require('./CifStringWriter');
var CifCategoryWriters_1 = require('./CifCategoryWriters');
var fCifCategoryWriters_1 = require('./fCifCategoryWriters');
var Version_1 = require('../Api/Version');
var CifWriterConfig = (function () {
    function CifWriterConfig() {
        this.includedCategories = [
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
        this.useFCif = false;
        this.type = '?';
        this.params = [];
    }
    return CifWriterConfig;
}());
exports.CifWriterConfig = CifWriterConfig;
var DefaultCifWriter = (function () {
    function DefaultCifWriter() {
    }
    DefaultCifWriter.prototype.writeParams = function (writer, params, common) {
        var prms = [];
        for (var _i = 0, params_1 = params; _i < params_1.length; _i++) {
            var p = params_1[_i];
            prms.push(p);
        }
        prms.push({ name: 'atomSitesOnly', value: common.atomSitesOnly ? '1' : undefined });
        prms.push({ name: 'modelId', value: common.modelId });
        var ctx = prms;
        var fields = [
            { name: '_coordinate_server_query_params.name', src: function (ctx, i) { return ctx[i].name; } },
            { name: '_coordinate_server_query_params.value', src: function (ctx, i) { return ctx[i].value === undefined ? '.' : '' + ctx[i].value; } },
        ];
        CifCategoryWriters_1.default.writeRecords(fields, ctx, ctx.length, writer);
        if (ctx.length > 0)
            writer.write('#\n');
    };
    DefaultCifWriter.prototype.writeResultHeader = function (_a, config, writer) {
        var isEmpty = _a.isEmpty, hasError = _a.hasError;
        writer.write("_coordinate_server_result.query_type         ");
        writer.writeChecked(config.type);
        writer.newline();
        writer.write("_coordinate_server_result.datetime           ");
        writer.writeChecked(new Date().toLocaleString('en-US'));
        writer.newline();
        writer.write("_coordinate_server_result.is_empty           " + (isEmpty ? 'yes' : 'no'));
        writer.newline();
        writer.write("_coordinate_server_result.has_error          " + (hasError ? 'yes' : 'no'));
        writer.newline();
        //writer.write(`_coordinate_server_result.atom_sites_only    ${config.commonParams.atomSitesOnly ? 'yes' : 'no'}`); writer.newline();
        //writer.write(`_coordinate_server_result.model_id           `); writer.writeChecked(config.commonParams.modelId ? config.commonParams.modelId : undefined); writer.newline();
        writer.write("_coordinate_server_result.api_version        " + Version_1.default);
        writer.newline();
        writer.write("_coordinate_server_result.core_version       " + Core.VERSION.number);
        writer.newline();
        writer.write("#\n");
    };
    DefaultCifWriter.prototype.writeError = function (header, message, config) {
        var writer = new CifStringWriter_1.default();
        writer.write("data_" + (header || '').replace(/[ \n\t]/g, '').toUpperCase() + "\n#\n");
        this.writeResultHeader({ isEmpty: true, hasError: true }, config, writer);
        var ctx = message;
        var fields = [
            { name: '_coordinate_server_error.message', src: function (ctx, i) { return ctx; } }
        ];
        CifCategoryWriters_1.default.writeRecords(fields, ctx, 1, writer);
        writer.write('#\n');
        this.writeParams(writer, config.params, config.commonParams);
        return writer.writer.asString();
    };
    DefaultCifWriter.prototype.writeFragment = function (data, models, config) {
        var writer = new CifStringWriter_1.default();
        var included = config.includedCategories;
        writer.write("data_" + data.header + "\n#\n");
        var isEmpty = !models || !models.length || !models.some(function (m) { return m.fragments.length > 0; });
        this.writeResultHeader({ isEmpty: isEmpty, hasError: false }, config, writer);
        this.writeParams(writer, config.params, config.commonParams);
        if (isEmpty) {
            return writer.writer;
        }
        var unionFragment = models[0].fragments.unionFragment();
        if (config.useFCif) {
            var contents = new fCifCategoryWriters_1.default.CifWriterContents(unionFragment, models[0].model, data);
            if (!config.commonParams.atomSitesOnly) {
                if (!included)
                    included = data.categoryList.map(function (c) { return c.name; });
                for (var _i = 0, included_1 = included; _i < included_1.length; _i++) {
                    var c = included_1[_i];
                    var w = fCifCategoryWriters_1.default.CategoryWriters[c];
                    if (w)
                        w(contents, writer);
                }
            }
            fCifCategoryWriters_1.default.writeChainSites(contents, writer);
            fCifCategoryWriters_1.default.writeResidueSites(contents, writer);
            fCifCategoryWriters_1.default.writeAtomSites(models, contents, writer);
        }
        else {
            var contents = new CifCategoryWriters_1.default.CifWriterContents(unionFragment, models[0].model, data);
            if (!config.commonParams.atomSitesOnly) {
                if (!included)
                    included = data.categoryList.map(function (c) { return c.name; });
                for (var _a = 0, included_2 = included; _a < included_2.length; _a++) {
                    var c = included_2[_a];
                    var w = CifCategoryWriters_1.default.CategoryWriters[c];
                    if (w)
                        w(contents, writer);
                }
            }
            CifCategoryWriters_1.default.writeAtomSites(models, contents, writer);
        }
        return writer.writer;
    };
    return DefaultCifWriter;
}());
exports.DefaultCifWriter = DefaultCifWriter;
