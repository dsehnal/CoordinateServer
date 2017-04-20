# CoordinateServer API reference
## Residues Inside a Sphere ``/ambientResidues``
Identifies all residues within the given radius from the source residue.
### Example
``/1cbs/ambientResidues?authAsymId=A&authName=REA&authSeqNumber=200&radius=5``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``entityId``|String||Corresponds to the '_entity.id' or '*.label_entity_id' field, depending on the context.|
|``asymId``|String||Corresponds to the '_atom_site.label_asym_id' field.|
|``authAsymId``|String||Corresponds to the '_atom_site.auth_asym_id' field.|
|``name``|String||Residue name. Corresponds to the '_atom_site.label_comp_id' field.|
|``authName``|String||Author residue name. Corresponds to the '_atom_site.auth_comp_id' field.|
|``insCode``|String||Corresponds to the '_atom_site.pdbx_PDB_ins_code' field.|
|``seqNumber``|Integer||Residue seq. number. Corresponds to the '_atom_site.label_seq_id' field.|
|``authSeqNumber``|Integer||Author residue seq. number. Corresponds to the '_atom_site.auth_seq_id' field.|
|``radius``|Float|5|Value in Angstroms.|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Assembly ``/assembly``
Constructs assembly with the given id.
### Example
``/1e12/assembly?id=1``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``id``|String|1|Corresponds to the '_pdbx_struct_assembly.id' field.|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _cell, _symmetry, _struct_conf, _struct_sheet_range, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Backbone Atoms ``/backbone``
Atoms named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C4, C5' from polymer entities.
### Example
``/1cbs/backbone``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Cartoon Representation ``/cartoon``
Atoms necessary to construct cartoons representation of the molecule (atoms named CA, O, O5', C3', N3 from polymer entities) + HET atoms + water.
### Example
``/1cbs/cartoon``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Specific Chains ``/chains``
Chains that satisfy the given parameters.
### Example
``/1cbs/chains?authAsymId=A``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``entityId``|String||Corresponds to the '_entity.id' or '*.label_entity_id' field, depending on the context.|
|``asymId``|String||Corresponds to the '_atom_site.label_asym_id' field.|
|``authAsymId``|String||Corresponds to the '_atom_site.auth_asym_id' field.|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Specific Entities ``/entities``
Entities that satisfy the given parameters.
### Example
``/1cbs/entities?type=polymer``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``entityId``|String||Corresponds to the '_entity.id' or '*.label_entity_id' field, depending on the context.|
|``type``|String||Corresponds to the '_entity.type' field (polymer / non-polymer / water).|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Full Structure ``/full``
The full structure.
### Example
``/1cbs/full``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## HET Atoms ``/het``
All non-water 'HETATM' records.
### Example
``/1cbs/het``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Ligand Interaction ``/ligandInteraction``
Identifies symmetry mates and returns the specified atom set and all residues within the given radius.
### Example
``/1cbs/ligandInteraction?authAsymId=A&authName=REA&authSeqNumber=200&radius=5``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``entityId``|String||Corresponds to the '_entity.id' or '*.label_entity_id' field, depending on the context.|
|``asymId``|String||Corresponds to the '_atom_site.label_asym_id' field.|
|``authAsymId``|String||Corresponds to the '_atom_site.auth_asym_id' field.|
|``name``|String||Residue name. Corresponds to the '_atom_site.label_comp_id' field.|
|``authName``|String||Author residue name. Corresponds to the '_atom_site.auth_comp_id' field.|
|``insCode``|String||Corresponds to the '_atom_site.pdbx_PDB_ins_code' field.|
|``seqNumber``|Integer||Residue seq. number. Corresponds to the '_atom_site.label_seq_id' field.|
|``authSeqNumber``|Integer||Author residue seq. number. Corresponds to the '_atom_site.auth_seq_id' field.|
|``radius``|Float|5|Value in Angstroms.|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _cell, _symmetry, _struct_conf, _struct_sheet_range, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Specific Residues ``/residues``
Residues that satisfy the given parameters.
### Example
``/1cbs/residues?authAsymId=A&authName=REA&authSeqNumber=200``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``entityId``|String||Corresponds to the '_entity.id' or '*.label_entity_id' field, depending on the context.|
|``asymId``|String||Corresponds to the '_atom_site.label_asym_id' field.|
|``authAsymId``|String||Corresponds to the '_atom_site.auth_asym_id' field.|
|``name``|String||Residue name. Corresponds to the '_atom_site.label_comp_id' field.|
|``authName``|String||Author residue name. Corresponds to the '_atom_site.auth_comp_id' field.|
|``insCode``|String||Corresponds to the '_atom_site.pdbx_PDB_ins_code' field.|
|``seqNumber``|Integer||Residue seq. number. Corresponds to the '_atom_site.label_seq_id' field.|
|``authSeqNumber``|Integer||Author residue seq. number. Corresponds to the '_atom_site.auth_seq_id' field.|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Sidechain Atoms ``/sidechain``
Atoms not named N, CA, C, O, P, OP1, OP2, O3', O5', C3', C4, C5' from polymer entities.
### Example
``/1cbs/sidechain``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Symmetry Mates ``/symmetryMates``
Identifies symmetry mates within the given radius.
### Example
``/1cbs/symmetryMates?radius=5``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``radius``|Float|5|Value in Angstroms.|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _cell, _symmetry, _struct_conf, _struct_sheet_range, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## C-Alpha/P Trace ``/trace``
Atoms named CA and P from polymer entities + optionally HET and/or water atoms.
### Example
``/1cbs/trace?het=1``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``het``|Integer|0|If 1, include HET atoms.|
|``water``|Integer|0|If 1, include water atoms.|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

## Water Atoms ``/water``
Atoms from entities with type water.
### Example
``/1cbs/water``
### Parameters
|Name|Type|Default|Description|
|----|----|-------|-----------|
|``modelId``|String||If set, only include atoms with the corresponding '_atom_site.pdbx_PDB_model_num' field.|
|``atomSitesOnly``|Integer|0|If 1, only the '_atom_site' category is returned.|
|``format``|String|mmCIF|Determines the output format (Currently supported: 'mmCIF').|
|``encoding``|String|cif|Determines the output encoding (text based 'CIF' or binary 'BCIF').|
|``lowPrecisionCoords``|Integer|0|If 1, stores coordinates with 1 digit instead of 3 digit precision (B-factors are stored with 1 digit precision instead of 2 when using the low precision).|
### Included mmCIF Categories
_entry, _entity, _exptl, _struct_conf, _struct_sheet_range, _pdbx_struct_assembly, _pdbx_struct_assembly_gen, _pdbx_struct_oper_list, _cell, _symmetry, _entity_poly, _struct_asym, _pdbx_struct_mod_residue, _chem_comp_bond, _atom_sites, _atom_site

___

Generated for CoordinateServer 1.4.1, LiteMol Core 3.1.2 - April 12 2017

