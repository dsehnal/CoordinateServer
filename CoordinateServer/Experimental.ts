
import ServerConfig from './ServerConfig';

import * as fs from 'fs';

import * as Core from 'LiteMol-core';

import Cif = Core.Formats.Cif;

import * as express from 'express';

//import PDBcifWriter from './Writers/PDBcifWriter'
import WidePDBfWriter from './Writers/WidePDBWriter'

export default class ExperimentalApi {

    private static makePath(p: string) {
        return ServerConfig.appPrefix + '/' + p;
    }


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


    private widePDB() {

        this.app.get(ExperimentalApi.makePath(':id/widepdb'), (req, res) => {

            var filename = ServerConfig.mapPdbIdToFilename(req.params.id);

            fs.readFile(filename, 'utf8', (err, data) => {
                if (err) {

                    console.error('' + err);
                    res.writeHead(404);
                    res.end();
                    return;
                }

                try {
                    let dict = Cif.Parser.parse(data),
                        block = dict.result.dataBlocks[0];


                    let writer = new WidePDBfWriter(block);

                    let pdbCif = writer.write();

                    res.writeHead(200, {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'X-Requested-With'
                    });

                    
                    //let stream = fs.createWriteStream("c:/test/widepdb/" + req.params.id + ".pdb");

                    pdbCif.writeTo(res);                    
                    res.end();
                    //stream.end();

                } catch (e) {
                    console.error('' + e);
                    res.writeHead(404);
                    res.end();
                    return;
                }
            });
        });
    }

    init() {

        //this.pdbCif();
        this.widePDB();

    }

    constructor(private app: express.Express) {
    }

}