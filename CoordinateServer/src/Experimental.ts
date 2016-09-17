
import ServerConfig from './ServerConfig';

import * as fs from 'fs';

import * as Core from 'LiteMol-core';

import CIF = Core.Formats.CIF;

import * as express from 'express';

export default class ExperimentalApi {

    private static makePath(p: string) {
        return ServerConfig.appPrefix + '/' + p;
    }
    
    init() {

    }

    constructor(private app: express.Express) {
    }

}