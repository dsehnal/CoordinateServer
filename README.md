![CoordinateServer](logo.png)

# About

CoordinateServer is a fast, web-based tool for querying a subset of mmCIF coordinate data for a PDB entry held in the PDB archive. 
The server is able to return the specific portions of the structure that are relevant, as specified in your query. For example, 
the coordinates of the atoms within a 5Å radius around the ligand binding site, including symmetry mates.
As a result, it greatly reduces the time needed to transmit and manipulate the data.

The application is written in [TypeScript](https://www.typescriptlang.org/) on top of the
[LiteMol](https://github.com/dsehnal/LiteMol) and [CIFTools.js](https://github.com/dsehnal/CIFTools.js) libraries. 

There is an instance of the server at the [WebChem](https://webchem.ncbr.muni.cz/CoordinateServer/) and PDBe.

# Running the Server 

**The server currently only works on [mmCIF](http://mmcif.wwpdb.org/) files.**

- Install [Node.js](https://nodejs.org/en/) (tested on Node 6.* and 7.*; x64 version is strongly preferred).

- Get the code:

    ```
    git clone https://github.com/dsehnal/CoordinateServer.git
    ```
    or [download it as ZIP](https://github.com/dsehnal/CoordinateServer/archive/master.zip). No building is required, only the `build` folder and the ``package.json`` file in the archive are needed.

- ``"cd CoordinateServer"``

- Install production dependencies:

   ```
   npm install --only=production
   ```

- Update ``build/server-config.js`` to link to your data and optionally tweak the other parameters.

    * Edit the `appPrefix`. This determines the prefix of the server after the domain name, for example ``appPrefix: 'CoordinateServer'`` => ``http://localhost:PORT/CoordinateServer``.
    * Map to your mmCIF files.
    * Setup cache.
    * Setup server restarts (this requires [forever.js](https://github.com/foreverjs/forever) or a similar tool to work). This is because of a [flaw in Node.js/v8](https://github.com/nodejs/node/issues/8670).

- Run it:
    ```
    node build/server
    ```
    
    The server will then be running on `http://localhost:PORT/APP_PREFIX`, where `PORT` and `APP_PREFIX` are specified
    in `build/ServerConfig.js`. The default page will show documentation for the available queries.

    In production it is a good idea to use a service that will keep the server running, such as [forever.js](https://github.com/foreverjs/forever).

# Command Line Mode

Create one or more `jobs.json` files (refer to `examplejobs.json` for the template or see below) and 
run 

    node build/local jobs.json

It is recommended that you split queries of larger data sets into jobs that contain
no more than 10000 entities.

### Job entry template

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

# Building

- Get the code:

    ```
    git clone https://github.com/dsehnal/CoordinateServer.git
    ```

- Install dependencies:

    ```
    cd CoordinateServer
    npm install gulp -g
    npm install
    ```

- Build:

    ```
    gulp
    ```

# License

This project is licensed under the Apache 2.0 license. See the [LICENSE](https://github.com/dsehnal/CoordinateServer/blob/master/LICENSE) file for more info.