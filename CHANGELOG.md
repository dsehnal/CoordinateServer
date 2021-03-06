﻿# 1.4.10
* Support &dataSource query parameter in web API.

# 1.4.9
* Added _entity_poly_seq to output.
* Added residueRange query.

# 1.4.8
* Tweak in CIF writer (correctly escape values starting with $[])

# 1.4.7
* Added _pdbx_nonpoly_scheme to /full and /assembly

# 1.4.6
* Fixed a bug in _struct_sheet_range.id. 

# 1.4.5
* Fixed a BinaryCIF encoding bug in CIFTools.
* Using spatial hash instead of "subdivisions tree" for 3D neighborhood search.

# 1.4.4
* Added support for _struct_conn and _struct_conn_type categories.

# 1.4.3
* Changes were made :)

# 1.4.2
* Fixed a bug in _atom_site writer for symmetry/assembly data.
* Optimized /ligandInteraction and /ambientResidues queries if they are used for large input sets (i.e. just /ligandInteraction).

# 1.4.1
* Fixed a buf in assembly generation in LiteMol Core.

# 1.4.0
* Updated to the latest LiteMol-core.
* Refactored to get rid of Visual Studio project.

# 1.3.13
* Updated to Core 3.0.0.

# 1.3.12
* BinaryCIF update.

# 1.3.11
* Updated /trace query.

# 1.3.10
* Added _exptl category to the output CIF.

# 1.3.9
* BinaryCIF 0.2.0 support (origin property in delta encoding).

# 1.3.8
* Moved to using CIFTools.js writer from LiteMol.Core.

# 1.3.7
* Improved BinaryCIF encoder.

# 1.3.6
* Improved documentation.
* Fixed a bug in _coordinate_server_query_params category.

# 1.3.5
* Fixed a bug that cause /ligandInteraction, /symmetry and /assembly queries to not work.
* Added a queue for consecutive requests to the same entry to avoid it being parsed multiple times.

# 1.3.4
* Moved to TypeScript 2.0.
* Added the option to automatically shut down the server.
* Small bug fixes.

# 1.3.3
* Updated to new core.
* Attempts to counter the GC from collecting (and ultimately deoptimizing) code on long runs.

# 1.3.2
* Added the /trace query.
* Fixed a bug in the mmCIF assembly parsing.

# 1.3.1
* Added lowPrecisionCoords option for queries.

# 1.3.0
* Added support for choosing output format.
* Added support for the BinaryCIF encoding.
* Improved documentation.

# 1.2.10
* Fixed _struct_sheet_range.conf_type_id -> _struct_sheet_range.sheet_id.

# 1.2.9
* Additional info included in the _entity category.

# 1.2.8
* Updated to newer version of Core that fixes issues with overlapping secondary structure.

# 1.2.7
* Updated to newer version of Core that fixes more issues with assembly generation.

# 1.2.6
* Updated to newer version of Core that fixes issues with symmetry/assembly generation.

# 1.2.5
* Added support for .gz files.

# 1.2.4
* Fixed issues with symmetry related asymId generation.
* cartoons query now also includes het groups and waters.

# 1.2.3
* Fixed a bug CIF writer with duplicate _entity records.
* Fixed a bug with sometimes incorrect asym ids in symmetry related queries.
* Basic Query API has been refactored in the core.

# 1.2.2
* Documentation is now in separate source file.

# 1.2.1
* Added support for modelId in queries.

# 1.2.0
* Added caching support.
* Refactored the API.
* Support for local (file system) mode.

# 1.1.6
* Better error reporting when parsing CIF failed.
* Updated Core that fixes a CIF parser bug.

# 1.1.5
* Fixed a CifWriter bug (regarding secondary structure).

# 1.1.4
* Updated _entity_poly generation.

# 1.1.3
* Secondary structure support for assemblies and symmetry mates.

# 1.1.2
* Fix to entity poly.

# 1.1.1
* Bug fix in writing entities for computed molecules (symmetry and assembly)

# 1.1.0
* Various bug fixes
* Rewrote the CIF writer
* Categories in the output CIF should now be consistent with what's in the _atom_site category
* Added support for additional categories in the output
* Added support for symmetry mates and assemblies 
* Added coordinate server specific categories to the output CIF (_entity_poly, _struct_asym, _pdbx_struct_mod_residue)
* Better error reporting

# 1.0.2
* Experimental support for widePDB
* Optimized CIF writer
* Added optional multi-core support using 'cluster'
* Added simple logging

# 1.0.1
* Added /documentation

# 1.0.0
* Initial release