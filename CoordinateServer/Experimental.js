"use strict";
var ServerConfig_1 = require('./ServerConfig');
var fs = require('fs');
var Core = require('LiteMol-core');
var Cif = Core.Formats.Cif;
//import PDBcifWriter from './Writers/PDBcifWriter'
var WidePDBWriter_1 = require('./Writers/WidePDBWriter');
var ExperimentalApi = (function () {
    function ExperimentalApi(app) {
        this.app = app;
    }
    ExperimentalApi.makePath = function (p) {
        return ServerConfig_1.default.appPrefix + '/' + p;
    };
    //private pdbCif() {
    //    this.app.get(ExperimentalApi.makePath(':id/pdbcif'), (req, res) => {
    //        var filename = ServerConfig.mapPdbIdToFilename(req.params.id);
    //        fs.readFile(filename, 'utf8', (err, data) => {
    //            if (err) {
    //                console.error('' + err);
    //                res.writeHead(404);
    //                res.end();
    //                return;
    //            }
    //            try {
    //                let dict = Cif.Parser.parse(data),
    //                    block = dict.result.dataBlocks[0];
    //                let writer = new PDBcifWriter(block);
    //                let pdbCif = writer.write();
    //                res.writeHead(200, {
    //                    'Content-Type': 'text/plain; charset=utf-8',
    //                    'Access-Control-Allow-Origin': '*',
    //                    'Access-Control-Allow-Headers': 'X-Requested-With'
    //                });
    //                res.end(pdbCif);
    //            } catch (e) {
    //                console.error('' + e);
    //                res.writeHead(404);
    //                res.end();
    //                return;
    //            }
    //        });
    //    });
    //}
    ExperimentalApi.prototype.widePDB = function () {
        this.app.get(ExperimentalApi.makePath(':id/widepdb'), function (req, res) {
            var filename = ServerConfig_1.default.mapPdbIdToFilename(req.params.id);
            fs.readFile(filename, 'utf8', function (err, data) {
                if (err) {
                    console.error('' + err);
                    res.writeHead(404);
                    res.end();
                    return;
                }
                try {
                    var dict = Cif.Parser.parse(data), block = dict.result.dataBlocks[0];
                    var writer = new WidePDBWriter_1.default(block);
                    var pdbCif = writer.write();
                    res.writeHead(200, {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'X-Requested-With'
                    });
                    //let stream = fs.createWriteStream("c:/test/widepdb/" + req.params.id + ".pdb");
                    pdbCif.writeTo(res);
                    res.end();
                }
                catch (e) {
                    console.error('' + e);
                    res.writeHead(404);
                    res.end();
                    return;
                }
            });
        });
    };
    ExperimentalApi.prototype.init = function () {
        //this.pdbCif();
        this.widePDB();
    };
    return ExperimentalApi;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ExperimentalApi;
