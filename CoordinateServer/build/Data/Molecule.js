"use strict";
var Model = (function () {
    function Model(model) {
        this.model = model;
    }
    return Model;
}());
exports.Model = Model;
var Molecule = (function () {
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
