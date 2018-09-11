"use strict";
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Model = /** @class */ (function () {
    function Model(model) {
        this.model = model;
    }
    return Model;
}());
exports.Model = Model;
var Molecule = /** @class */ (function () {
    function Molecule(key, cif, molecule, dataSize) {
        this.key = key;
        this.cif = cif;
        this.molecule = molecule;
        this.dataSize = dataSize;
        this.models = molecule.models.map(function (m) { return new Model(m); });
        this.approximateSize = dataSize * 3;
    }
    Molecule.createKey = function (filename) {
        return filename.trim().toLowerCase();
    };
    return Molecule;
}());
exports.Molecule = Molecule;
