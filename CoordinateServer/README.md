![CoordinateServer](logo.png)

# About

CoordinateServer is a fast, web-based tool for returning a subset of mmCIF coordinate data for a PDB entry held in the PDB archive. 
The server is able to return the specific portions of the structure that are relevant, as specified in your query. For example, 
the coordinates of the atoms within a 5Å radius around the ligand binding site, including symmetry mates.
As a result, it greatly reduces the time needed to transmit and manipulate the data.

The application is written in [TypeScript](https://www.typescriptlang.org/) on top of the
[LiteMol](https://github.com/dsehnal/LiteMol) and [CIFTools.js](https://github.com/dsehnal/CIFTools.js) libraries. 

# Running the Server


### Setup

The server works on [mmCIF](http://mmcif.wwpdb.org/) files.

Edit `build/ServerConfig.js` to:
* Map to your mmCIF files.
* Setup cache.
* Setup server restarts.

### Running

The server can be run using the command

    node build/server

However, it is recommended to use a tool (such as [forever.js](https://github.com/foreverjs/forever)) that will keep the server running
in case of unexpected crashes, spawning multiple instances, etc. Search 
Google for a solution that will suit your needs the most.

## Command Line Mode

Create one or more `jobs.json` files (refer to `examplejobs.json` for the template or see below) and 
run 

    node build/local jobs.json

It is recommended that you split queries of larger data sets into jobs that contain
no more than 10000 entities.

#### Job entry template

The ``jobs.json`` file needs with specify a list of jobs using this template:

```javascript
[{
    "inputFilename": "./data/1cbs.cif",
    "outputFilename": "./result/ligandInteraction/1cbs.bcif",
    "query": "ligandInteraction", 
    "params": {
        "name": "REA",
        "atomSitesOnly": "1",
        "encoding": "bcif"
    }
},
...
]
```

The values for `query` are the same as the names of the queries in the WebAPI. The param
names in `params` are the same as well. Refer to the default page of the CoordinateServer
web for the API documentation. 

## Building

    npm install -g typescript
    tsc
