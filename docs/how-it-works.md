How it works
============

This document provides a high level overview of how the CoordinateServer works.

- Client (user) makes a query.
- The server checks if the query is supported and what are its parameters.
- Load the molecule that needs to be queried to memory.
  - Optionally, the molecule can be cached in memory if it was queried recently to speed up the query.
  - Optionally, compute symmetry mates (if available/required).
- Execute the desired query.
- Encode the result in text CIF or BinaryCIF using the user-preferred coordinate precision.
- Send the result to the client or store it to disk depending on the mode the server is being used in.

### Data Representation, Parsing and Encoding

The CoordinateServer is build upon the [LiteMol Core library](https://github.com/dsehnal/LiteMol).
LiteMol Core integrates the [CIFTools.js library](https://github.com/dsehnal/CIFTools.js) that 
provides support for reading and writing CIF and [BinaryCIF](https://github.com/dsehnal/Binary) files.

### Query Language

The query language used behing the scenes is a version/dialect of the PatternQuery language
discussed in [this article](http://dx.doi.org/10.1093/nar/gkv561) and the authors
[Ph.D. dissertation](https://is.muni.cz/th/140435/fi_d/?lang=en).