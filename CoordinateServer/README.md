# LiteMol CoordinateServer

## Setup

Edit `build/ServerConfig.js` to:
* Map to your CIF files.
* Setup cache.
* Setup server restarts.

## Running Server

The server can be run using the command

    node build/server

However, it is recommended to use a tool that will keep the server running
in case of unexpected crashes, spawning multiple instances, etc. Search 
Google for a solution that will suit your needs the most.

## Running in Command Line Mode

Create one or more `jobs.json` files (refer to `examplejobs.json` for the template or see below) and 
run 

    node build/local jobs.json

It is recommended that you split queries of larger data sets into jobs that contain
no more than 10000 enties.

### Job entry template

Each job in the local mode needs to be specified using this template:

    {
        "inputFilename": "./x/y/z.cif",
        "outputFilename": "./u/v/w.bcif",
        "query": "ligandInteraction", 
        "params": {
            "name": "REA",
            "atomSitesOnly": "1",
            "encoding": "bcif"
        }
    }

The values for `query` are the same as the names of the queries in the WebAPI. The param
names in `params` are the same as well. Refer to the default page of the CoordinateServer
web for the API documentation. 

## Building

    npm install -g typescript
    tsc
