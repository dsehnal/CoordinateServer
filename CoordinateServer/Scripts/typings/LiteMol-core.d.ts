declare namespace LiteMol.Core {
    var VERSION: {
        number: string;
        date: string;
    };
}
declare namespace LiteMol.Core.Formats {
    class ParserError {
        message: string;
        line: number;
        toString(): string;
        constructor(message: string, line: number);
    }
    /**
     * A generic parser result.
     */
    class ParserResult<T> {
        error: ParserError;
        warnings: string[];
        result: T;
        static error(message: string, line?: number): ParserResult<any>;
        static success<T>(result: T, warnings?: string[]): ParserResult<T>;
        constructor(error: ParserError, warnings: string[], result: T);
    }
    /**
     * A helper class for building a typed array of token indices.
     */
    class TokenIndexBuilder {
        private tokensLenMinus2;
        private count;
        tokens: Int32Array;
        private resize();
        addToken(start: number, end: number): void;
        constructor(size: number);
    }
    /**
     * A helper class to store only unique strings.
     */
    class ShortStringPool {
        static strings: Map<string, string>;
        static getString(key: string): string;
    }
}
declare namespace LiteMol.Core.Formats.Cif {
    /**
     * Represents the input file.
     */
    class File {
        /**
         * The input string.
         *
         * In JavaScript, the input must always* be a string as there is no support for streams.
         * So since we already have the string in memory, we won't store unnecessary copies of
         * substrings but rather represent individual elements as pairs of <start,end) indices
         * to the data string.
         *
         * * It can also be a typed array buffer, but the point still holds: we need to have the entire
         *   input in memory. And most molecular file formats are text based.
         */
        data: string;
        /**
         * Data blocks inside the file. If no data block is present, a "default" one is created.
         */
        dataBlocks: Block[];
        /**
         * Adds a block.
         */
        addBlock(block: Block): void;
        toJSON(): {
            id: string;
            categories: any[];
            additionalData: {
                [name: string]: any;
            };
        }[];
        constructor(data: string);
    }
    /**
     * Represents a single data block.
     */
    class Block {
        private categoryMap;
        /**
         * The "file" the data block is in.
         */
        file: File;
        /**
         * The input mmCIF string (same as file.data)
         */
        data: string;
        /**
         * Header of the data block.
         */
        header: string;
        /**
         * Categories of the block.
         */
        categoryList: Category[];
        /**
         * Categories of the block.
         * block.categories._atom_site / ['_atom_site']
         */
        categories: {
            [name: string]: Category;
        };
        /**
         * Additional data such as save frames for mmCIF file.
         */
        additionalData: {
            [name: string]: any;
        };
        /**
         * Adds a category.
         */
        addCategory(category: Category): void;
        /**
         * Gets a category by its name.
         */
        getCategory(name: string): Category;
        /**
         * Determines if a given category is present.
         */
        hasCategory(name: string): boolean;
        toJSON(): {
            id: string;
            categories: any[];
            additionalData: {
                [name: string]: any;
            };
        };
        constructor(file: File, header: string);
    }
    /**
     * A context for easy (but slower) querying of category data.
     */
    class CategoryQueryRowContext {
        category: Category;
        rowNumber: number;
        /**
         * Get a string value of the row.
         */
        getString(column: string): string;
        /**
         * Get an integer value of the row.
         */
        getInt(column: string): number;
        /**
         * Get a float value of the row.
         */
        getFloat(column: string): number;
        constructor(category: Category, rowNumber: number);
    }
    /**
     * Represents a single column of a CIF category.
     */
    class Column {
        private category;
        name: string;
        index: number;
        /**
         * Returns the raw string value at given row.
         */
        getRaw(row: number): string;
        /**
         * Returns the string value at given row.
         */
        getString(row: number): string;
        /**
         * Returns the integer value at given row.
         */
        getInteger(row: number): number;
        /**
         * Returns the float value at given row.
         */
        getFloat(row: number): number;
        /**
         * Returns true if the token has the specified string value.
         */
        stringEquals(row: number, value: string): boolean;
        /**
         * Returns true if the value is not defined (. or ? token).
         */
        isUndefined(row: number): boolean;
        constructor(category: Category, name: string, index: number);
    }
    /**
     * Represents a single CIF category.
     */
    class Category {
        private data;
        private columnIndices;
        private columnWrappers;
        private shortColumnWrappers;
        private _columnArray;
        /**
         * Name of the category.
         */
        name: string;
        /**
         * The column names of the category.
         * Includes the full name, i.e. _namespace.columns.
         */
        columnNames: string[];
        /**
         * The column wrappers used to access the colummns.
         * Can be accessed for example as category.columns.id.
         */
        columns: {
            [name: string]: Column;
        };
        /**
         * The array of column wrappers used to access the colummns.
         */
        columnArray: Column[];
        /**
         * Number of columns in the category.
         */
        columnCount: number;
        /**
         * Number of rows in the category.
         */
        rowCount: number;
        /**
         * Number of tokens.
         */
        tokenCount: number;
        /**
         * Pairs of (start at index 2 * i, end at index 2 * i + 1) indices to the data string.
         * The "end" character is not included (for it's iterated as for (i = start; i < end; i++)).
         */
        tokens: number[];
        /**
         * Start index of the category in the input string.
         */
        startIndex: number;
        /**
         * Start index of the category in the input string.
         */
        endIndex: number;
        /**
         * Compute the token index.
         */
        getTokenIndex(row: number, columnIndex: number): number;
        /**
         * Get index of a columns.
         * @returns -1 if the column isn't present, the index otherwise.
         */
        getColumnIndex(name: string): number;
        /**
         * Get a column object that makes accessing data easier.
         * @returns undefined if the column isn't present, the Column object otherwise.
         */
        getColumn(name: string): Column;
        /**
         * Updates the range of the token given by the column and row.
         */
        updateTokenRange(columnIndex: number, row: number, token: {
            start: number;
            end: number;
        }): void;
        /**
         * Updates the range of the token given by its index.
         */
        updateTokenIndexRange(tokenIndex: number, token: {
            start: number;
            end: number;
        }): void;
        /**
         * Determines if the token at the given index is . or ?.
         */
        isTokenUndefined(index: number): boolean;
        /**
         * Determines if the token at the given range is . or ?.
         */
        isTokenRangeUndefined(start: number, end: number): boolean;
        /**
         * Determines if a column value is defined (has to be present and not . nor ?).
         */
        isValueUndefined(column: string, row?: number): boolean;
        /**
         * Determines if a column value is defined (has to be present and not . nor ?).
         */
        isValueUndefinedFromIndex(columnIndex: number, row: number): boolean;
        /**
         * Returns the length of the given token;
         */
        getTokenLengthFromIndex(columnIndex: number, row: number): number;
        /**
         * Get a string value from a token at a given index.
         */
        getStringValueFromToken(index: number): string;
        /**
         * Returns the string value of the column.
         * @returns null if not present or ./?.
         */
        getStringValue(column: string, row?: number): string;
        /**
         * Returns the string value of the column.
         * @returns Default if not present or ./?.
         */
        getStringValueOrDefault(column: string, defaultValue?: string, row?: number): string;
        /**
         * Returns the float value of the column.
         * @returns NaN if not present or ./?.
         */
        getFloatValue(column: string, row?: number): number;
        /**
         * Returns the float value of the column.
         * @returns Default if not present or ./?.
         */
        getFloatValueOrDefault(column: string, defaultValue?: number, row?: number): number;
        /**
         * Returns the integer value of the column.
         * @returns NaN if not present or ./?.
         */
        getIntValue(column: string, row?: number): number;
        /**
          * Returns the float value of the column.
          * @returns Default if not present or ./?.
          */
        getIntValueOrDefault(column: string, defaultValue?: number, row?: number): number;
        /**
         * Returns the raw value of the column (does not do null check for ./?).
         */
        getRawValueFromIndex(columnIndex: number, row: number): string;
        /**
         * Returns the string value of the column.
         */
        getStringValueFromIndex(columnIndex: number, row: number): string;
        /**
         * Returns the integer value of the column.
         */
        getIntValueFromIndex(columnIndex: number, row: number): number;
        /**
         * Returns the integer value of the column.
         */
        getFloatValueFromIndex(columnIndex: number, row: number): number;
        /**
         * Returns a matrix constructed from a given field: category.field[1..rows][1..cols]
         */
        getMatrix(field: string, rows: number, cols: number, rowIndex: number): number[][];
        /**
         * Returns a vector constructed from a given field: category.field[1..rows]
         */
        getVector(field: string, rows: number, cols: number, rowIndex: number): number[];
        getTransform(row: number, matrix: string, vector: string): number[];
        /**
         * Determines if two tokens have the same string value.
         */
        areTokensEqual(aIndex: number, bIndex: number): boolean;
        /**
         * Determines if a token contains a given string.
         */
        tokenEqual(aIndex: number, value: string): boolean;
        /**
         * Determines if a value contains a given string.
         */
        valueEqual(columnIndex: number, row: number, value: string): boolean;
        /**
         * Maps the rows to an user defined representation.
         *
         * @example
         *   // returns an array objects with id and type properties.
         *   category.select(row => { id: row.getInt("_entity.id"), type: row.getString("_entity.type") })
         */
        select<T>(selector: (ctx: CategoryQueryRowContext) => T): T[];
        /**
         * Maps the rows that satisfy a condition to an user defined representation.
         *
         * @example
         *   // returns entity ids of entities with weight > 1000.
         *   category.selectWhere(
         *     row => row.getFloat("_entity.weight") > 1000,
         *     row => row.getInt("_entity.id"))
         */
        selectWhere<T>(condition: (ctx: CategoryQueryRowContext) => boolean, selector: (ctx: CategoryQueryRowContext) => T): T[];
        constructor(data: string, name: string, startIndex: number, endIndex: number, columns: string[], tokens: number[], tokenCount: number);
        toJSON(): any;
    }
}
declare namespace LiteMol.Core.Formats.Cif {
    class mmCif {
        private static getModelEndRow(startRow, category);
        private static buildModelAtomTable(startRow, category);
        private static buildStructure(category, atoms);
        private static assignEntityTypes(category, entities);
        static residueIdfromColumns(cat: Category, row: number, asymId: string, seqNum: string, insCode: string): Structure.PolyResidueIdentifier;
        private static aminoAcidNames;
        private static isResidueAminoSeq(atoms, residues, entities, index);
        private static isResidueNucleotide(atoms, residues, entities, index);
        private static analyzeSecondaryStructure(atoms, residues, entities, start, end, elements);
        private static splitNonconsecutiveSecondaryStructure(residues, elements);
        private static updateSSIndicesAndFilterEmpty(elements, structure, target);
        private static getSecondaryStructureInfo(data, atoms, structure);
        private static parseOperatorList(value);
        private static getAssemblyInfo(data);
        private static getSymmetryInfo(data);
        private static getComponentBonds(category);
        private static getModel(startRow, data);
        static ofDataBlock(data: Block): Structure.Molecule;
    }
}
declare namespace LiteMol.Core.Formats.Cif {
    /**
     * mmCIF parser.
     *
     * Trying to be as close to the specification http://www.iucr.org/resources/cif/spec/version1.1/cifsyntax
     *
     * Differences I'm aware of:
     * - Except keywords (data_, loop_, save_) everything is case sensitive.
     * - The tokens . and ? are treated the same as the values '.' and '?'.
     * - Ignores \ in the multiline values:
     *     ;abc\
     *     efg
     *     ;
     *   should have the value 'abcefg' but will have the value 'abc\\nefg' instead.
     *   Post processing of this is left to the consumer of the data.
     * - Similarly, things like punctuation (\', ..) are left to be processed by the user if needed.
     *
     */
    class Parser {
        /**
         * Reads a category containing a single row.
         */
        private static handleSingle(tokenizer, block);
        /**
         * Reads a loop.
         */
        private static handleLoop(tokenizer, block);
        /**
         * Creates an error result.
         */
        private static error(line, message);
        /**
         * Creates a data result.
         */
        private static result(data);
        /**
         * Parses an mmCIF file.
         *
         * @returns CifParserResult wrapper of the result.
         */
        static parse(data: string): ParserResult<Cif.File>;
    }
    function parse(data: string): ParserResult<File>;
}
declare namespace LiteMol.Core.Formats.PDB {
    type TokenRange = {
        start: number;
        end: number;
    };
    type HelperData = {
        dot: TokenRange;
        question: TokenRange;
        numberTokens: Map<number, TokenRange>;
        data: string;
    };
    class MoleculeData {
        header: Header;
        crystInfo: CrystStructureInfo;
        models: ModelsData;
        data: string;
        private makeEntities();
        toCifFile(): Cif.File;
        constructor(header: Header, crystInfo: CrystStructureInfo, models: ModelsData, data: string);
    }
    class Header {
        id: string;
        constructor(id: string);
    }
    class CrystStructureInfo {
        record: string;
        toCifCategory(id: string): {
            cell: Cif.Category;
            symm: Cif.Category;
        };
        constructor(record: string);
    }
    class SecondaryStructure {
        helixTokens: number[];
        sheetTokens: number[];
        toCifCategory(data: string): {
            helices: Cif.Category;
            sheets: Cif.Category;
        };
        constructor(helixTokens: number[], sheetTokens: number[]);
    }
    class ModelData {
        idToken: TokenRange;
        atomTokens: number[];
        atomCount: number;
        static COLUMNS: string[];
        private writeToken(index, cifTokens);
        private writeTokenCond(index, cifTokens, dot);
        private writeRange(range, cifTokens);
        private tokenEquals(start, end, value, data);
        private getEntityType(row, data);
        writeCifTokens(modelToken: TokenRange, cifTokens: Utils.ArrayBuilder<number>, helpers: HelperData): void;
        constructor(idToken: TokenRange, atomTokens: number[], atomCount: number);
    }
    class ModelsData {
        models: ModelData[];
        toCifCategory(block: Cif.Block, helpers: HelperData): Cif.Category;
        constructor(models: ModelData[]);
    }
}
declare namespace LiteMol.Core.Formats.PDB {
    class Parser {
        id: string;
        private data;
        private static tokenizeAtom(tokens, tokenizer);
        private static tokenize(id, data);
        static getDotRange(length: number): TokenRange;
        static getNumberRanges(length: number): Map<number, TokenRange>;
        static getQuestionmarkRange(length: number): TokenRange;
        static parse(id: string, data: string): ParserResult<any>;
        constructor(id: string, data: string);
    }
    function parse(id: string, data: string): ParserResult<any>;
}
declare namespace LiteMol.Core.Formats.CCP4 {
    /**
     * Represents electron density data from the CCP4 format.
     */
    class DensityData {
        /**
         * Crystal cell size.
         */
        cellSize: number[];
        /**
         * Crystal cell angles.
         */
        cellAngles: number[];
        /**
         * Origin of the cell
         */
        origin: number[];
        /**
         * 3D volumetric data.
         */
        data: number[];
        /**
         * X, Y, Z dimensions of the data matrix.
         */
        dataDimensions: number[];
        /**
         * The basis of the space.
         */
        basis: {
            x: number[];
            y: number[];
            z: number[];
        };
        /**
         * Start offsets.
         */
        startOffset: number[];
        /**
         * Was the skew matrix present in the input?
         */
        hasSkewMatrix: boolean;
        /**
         * Column major ordered skew matrix.
         */
        skewMatrix: number[];
        /**
         * Information about the min/max/mean/sigma values.
         */
        valuesInfo: {
            min: number;
            max: number;
            mean: number;
            sigma: number;
        };
        constructor(cellSize: number[], cellAngles: number[], origin: number[], hasSkewMatrix: boolean, skewMatrix: number[], data: number[], dataDimensions: number[], basis: {
            x: number[];
            y: number[];
            z: number[];
        }, startOffset: number[], valuesInfo: {
            min: number;
            max: number;
            mean: number;
            sigma: number;
        });
    }
    function parse(buffer: ArrayBuffer, options?: {
        normalize: boolean;
    }): ParserResult<DensityData>;
}
declare namespace LiteMol.Core.Geometry.LinearAlgebra {
    type ObjectVec3 = {
        x: number;
        y: number;
        z: number;
    };
    /**
     * Stores a 4x4 matrix in a column major (j * 4 + i indexing) format.
     */
    class Matrix4 {
        static empty(): number[];
        static identity(): number[];
        static ofRows(rows: number[][]): number[];
        static areEqual(a: number[], b: number[], eps: number): boolean;
        static setValue(a: number[], i: number, j: number, value: number): void;
        static copy(out: number[], a: any): number[];
        static clone(a: number[]): number[];
        static invert(out: number[], a: number[]): number[];
        static mul(out: number[], a: number[], b: number[]): number[];
        static translate(out: number[], a: number[], v: number[]): number[];
        static fromTranslation(out: number[], v: number[]): number[];
        static transformVector3(out: {
            x: number;
            y: number;
            z: number;
        }, a: {
            x: number;
            y: number;
            z: number;
        }, m: number[]): {
            x: number;
            y: number;
            z: number;
        };
        static makeTable(m: number[]): string;
        static determinant(a: number[]): number;
    }
    class Vector4 {
        static create(): number[];
        static clone(a: number[]): number[];
        static fromValues(x: number, y: number, z: number, w: number): number[];
        static set(out: number[], x: number, y: number, z: number, w: number): number[];
        static distance(a: number[], b: number[]): number;
        static squaredDistance(a: number[], b: number[]): number;
        static norm(a: number[]): number;
        static squaredNorm(a: number[]): number;
        static transform(out: number[], a: number[], m: number[]): number[];
    }
}
declare namespace LiteMol.Core.Geometry {
    /**
     * Basic shape of the result buffer for range queries.
     */
    interface ISubdivisionTree3DResultBuffer {
        count: number;
        indices: number[];
        hasPriorities: boolean;
        priorities: number[];
        add(distSq: number, index: number): void;
        reset(): void;
    }
    /**
     * A buffer that only remembers the values.
     */
    class SubdivisionTree3DResultIndexBuffer implements ISubdivisionTree3DResultBuffer {
        private capacity;
        count: number;
        indices: number[];
        hasPriorities: boolean;
        priorities: number[];
        private ensureCapacity();
        add(distSq: number, index: number): void;
        reset(): void;
        constructor(initialCapacity: number);
    }
    /**
     * A buffer that remembers values and priorities.
     */
    class SubdivisionTree3DResultPriorityBuffer implements ISubdivisionTree3DResultBuffer {
        private capacity;
        count: number;
        indices: number[];
        hasPriorities: boolean;
        priorities: number[];
        private ensureCapacity();
        add(distSq: number, index: number): void;
        reset(): void;
        constructor(initialCapacity: number);
    }
    /**
     * Query context. Handles the actual querying.
     */
    class SubdivisionTree3DQueryContext<T> {
        private tree;
        pivot: number[];
        radius: number;
        radiusSq: number;
        indices: number[];
        positions: number[];
        buffer: ISubdivisionTree3DResultBuffer;
        /**
         * Query the tree and store the result to this.buffer. Overwrites the old result.
         */
        nearest(x: number, y: number, z: number, radius: number): void;
        /**
         * Query the tree and use the position of the i-th element as pivot.
         * Store the result to this.buffer. Overwrites the old result.
         */
        nearestIndex(index: number, radius: number): void;
        constructor(tree: SubdivisionTree3D<T>, buffer: ISubdivisionTree3DResultBuffer);
    }
    /**
     * A kd-like tree to query 3D data.
     */
    class SubdivisionTree3D<T> {
        data: T[];
        indices: number[];
        positions: number[];
        root: SubdivisionTree3DNode;
        /**
         * Create a context used for querying the data.
         */
        createContextRadius(radiusEstimate: number, includePriorities?: boolean): SubdivisionTree3DQueryContext<T>;
        /**
         * Takes data and a function that calls SubdivisionTree3DPositionBuilder.add(x, y, z) on each data element.
         */
        constructor(data: T[], f: (e: T, b: SubdivisionTree3DPositionBuilder) => void, leafSize?: number);
    }
    /**
     * A builder for position array.
     */
    class SubdivisionTree3DPositionBuilder {
        private count;
        private boundsMin;
        private boundsMax;
        bounds: Box3D;
        data: number[];
        add(x: number, y: number, z: number): void;
        constructor(count: number);
    }
    /**
     * A tree node.
     */
    class SubdivisionTree3DNode {
        splitValue: number;
        startIndex: number;
        endIndex: number;
        left: SubdivisionTree3DNode;
        right: SubdivisionTree3DNode;
        private nearestLeaf<T>(ctx);
        private nearestNode<T>(ctx, dim);
        nearest<T>(ctx: SubdivisionTree3DQueryContext<T>, dim: number): void;
        constructor(splitValue: number, startIndex: number, endIndex: number, left: SubdivisionTree3DNode, right: SubdivisionTree3DNode);
    }
    /**
     * A helper to store boundary box.
     */
    class Box3D {
        min: number[];
        max: number[];
        constructor();
    }
}
declare namespace LiteMol.Core.Geometry.MarchingCubes {
    /**
     * The parameters required by the algorithm.
     */
    interface MarchingCubesParameters {
        dimenstions: number[];
        isoLevel: number;
        scalarField: number[];
        bottomLeft?: number[];
        topRight?: number[];
        annotationField?: number[];
    }
    function computeCubes(parameters: MarchingCubesParameters): MarchingCubesResult;
    class MarchingCubesResult {
        vertexCount: number;
        triangleCount: number;
        /**
         * Array of size 3 * vertexCount. Layout [x1, y1, z1, ...., xn, yn, zn]
         */
        vertices: number[];
        /**
         * 3 indexes for each triangle
         */
        triangleIndices: number[];
        /**
         * Per vertex annotation.
         */
        annotation: number[];
        /**
         * Array of size 3 * vertexCount. Layout [x1, y1, z1, ...., xn, yn, zn]
         *
         * Computed on demand.
         */
        normals: number[];
        private __normals;
        private computeVertexNormals();
        private static addVertex(src, i, dst, j);
        private laplacianSmoothIter(counts, vs);
        laplacianSmooth(iterCount?: number): void;
        constructor(vertices: number[], triangleIndices: number[], annotation: number[]);
    }
}
declare namespace LiteMol.Core.Geometry.MarchingCubes {
    /**
     * The parameters required by the algorithm.
     */
    interface MarchingSquares3DParameters {
        dimenstions: number[];
        isoLevel: number;
        scalarField: number[];
        bottomLeft: number[];
        topRight: number[];
    }
    function computeSquares3D(params: MarchingSquares3DParameters): MarchingSquares3DResult;
    class MarchingSquares3DResult {
        vertexCount: number;
        /**
         * Array of size 3 * vertexCount. Layout [x1, y1, z1, ...., xn, yn, zn]
         */
        vertices: number[];
        /**
         * 2 indexes for each edge
         */
        edgeIndices: number[];
        constructor(vertices: number[], edgeIndices: number[]);
    }
}
declare namespace LiteMol.Core.Geometry.MarchingCubes {
    class Index {
        i: number;
        j: number;
        k: number;
        constructor(i: number, j: number, k: number);
    }
    class IndexPair {
        a: Index;
        b: Index;
        constructor(a: Index, b: Index);
    }
    var EdgesXY: number[][];
    var EdgesXZ: number[][];
    var EdgesYZ: number[][];
    var CubeVertices: Index[];
    var CubeEdges: IndexPair[];
    var EdgeIdInfo: {
        i: number;
        j: number;
        k: number;
        e: number;
    }[];
    var EdgeTable: number[];
    var TriTable: number[][];
}
declare namespace LiteMol.Core.Geometry.MolecularSurface {
    interface IMolecularIsoSurfaceParameters {
        exactBoundary?: boolean;
        boundaryDelta?: {
            dx: number;
            dy: number;
            dz: number;
        };
        probeRadius?: number;
        atomRadius?: (i: number) => number;
        density?: number;
        interactive?: boolean;
        smoothingIterations?: number;
    }
    class MolecularIsoSurfaceParameters implements IMolecularIsoSurfaceParameters {
        exactBoundary: boolean;
        boundaryDelta: {
            dx: number;
            dy: number;
            dz: number;
        };
        probeRadius: number;
        atomRadius: (i: number) => number;
        defaultAtomRadius: number;
        density: number;
        interactive: boolean;
        smoothingIterations: number;
        constructor(params?: IMolecularIsoSurfaceParameters);
    }
    class MolecularIsoField {
        private positions;
        private atomIndices;
        constructor(parameters: IMolecularIsoSurfaceParameters, positions: Core.Structure.PositionTableSchema, atomIndices: number[]);
        parameters: MolecularIsoSurfaceParameters;
        x: number[];
        y: number[];
        z: number[];
        minX: number;
        minY: number;
        minZ: number;
        maxX: number;
        maxY: number;
        maxZ: number;
        nX: number;
        nY: number;
        nZ: number;
        dX: number;
        dY: number;
        dZ: number;
        field: Float32Array;
        maxField: Float32Array;
        proximityMap: Int32Array;
        minIndex: {
            i: number;
            j: number;
            k: number;
        };
        maxIndex: {
            i: number;
            j: number;
            k: number;
        };
        private findBounds();
        private initData();
        private updateMinIndex(x, y, z);
        private updateMaxIndex(x, y, z);
        private addBall(aI, strength);
        getData(): {
            data: MarchingCubes.MarchingCubesParameters;
            bottomLeft: {
                x: number;
                y: number;
                z: number;
            };
            topRight: {
                x: number;
                y: number;
                z: number;
            };
            transform: number[];
        };
    }
    class MolecularIsoSurfaceGeometryData {
        data: Core.Geometry.MarchingCubes.MarchingCubesResult;
        bottomLeft: LinearAlgebra.ObjectVec3;
        topRight: LinearAlgebra.ObjectVec3;
        transform: number[];
        vertexAtomIdMap: number[];
        parameters: MolecularIsoSurfaceParameters;
        constructor(data: Core.Geometry.MarchingCubes.MarchingCubesResult, bottomLeft: LinearAlgebra.ObjectVec3, topRight: LinearAlgebra.ObjectVec3, transform: number[], vertexAtomIdMap: number[], parameters: MolecularIsoSurfaceParameters);
        static fromField(field: MolecularIsoField): MolecularIsoSurfaceGeometryData;
        static create(positions: Core.Structure.PositionTableSchema, atomIndices: number[], params?: IMolecularIsoSurfaceParameters): MolecularIsoSurfaceGeometryData;
    }
}
declare namespace LiteMol.Core.Structure {
    class DataTableColumnDescriptor {
        name: string;
        creator: (size: number) => any;
        constructor(name: string, creator: (size: number) => any);
    }
    class DataTable {
        count: number;
        indices: number[];
        columns: DataTableColumnDescriptor[];
        clone(): DataTable;
        getBuilder(count: number): DataTableBuilder;
        getRawData(): any[][];
        constructor(count: number, source: DataTableBuilder);
    }
    class DataTableBuilder {
        count: number;
        columns: DataTableColumnDescriptor[];
        addColumn<T>(name: string, creator: (size: number) => T): T;
        getRawData(): any[][];
        /**
         * This functions clones the table and defines all its column inside the constructor, hopefully making the JS engine
         * use internal class instead of dictionary representation.
         */
        seal<TTable extends DataTable>(): TTable;
        constructor(count: number);
    }
    enum EntityType {
        Polymer = 0,
        NonPolymer = 1,
        Water = 2,
        Unknown = 3,
    }
    enum BondOrder {
        None = 0,
        Single = 1,
        Double = 2,
        Triple = 3,
        Quadruple = 4,
    }
    class ComponentBondInfoEntry {
        id: string;
        map: Map<string, Map<string, BondOrder>>;
        add(a: string, b: string, order: BondOrder, swap?: boolean): void;
        constructor(id: string);
    }
    class ComponentBondInfo {
        entries: Map<string, ComponentBondInfoEntry>;
        newEntry(id: string): ComponentBondInfoEntry;
    }
    /**
     * Identifier for a reside that is a part of the polymer.
     */
    class PolyResidueIdentifier {
        asymId: string;
        seqNumber: number;
        insCode: string;
        constructor(asymId: string, seqNumber: number, insCode: string);
        static areEqual(a: PolyResidueIdentifier, index: number, bAsymId: string[], bSeqNumber: number[], bInsCode: string[]): boolean;
        static compare(a: PolyResidueIdentifier, b: PolyResidueIdentifier): number;
        static compareResidue(a: PolyResidueIdentifier, index: number, bAsymId: string[], bSeqNumber: number[], bInsCode: string[]): number;
    }
    enum SecondaryStructureType {
        None = 0,
        Helix = 1,
        Turn = 2,
        Sheet = 3,
        AminoSeq = 4,
        Strand = 5,
    }
    class SecondaryStructureElement {
        type: SecondaryStructureType;
        startResidueId: PolyResidueIdentifier;
        endResidueId: PolyResidueIdentifier;
        info: any;
        startResidueIndex: number;
        endResidueIndex: number;
        length: number;
        constructor(type: SecondaryStructureType, startResidueId: PolyResidueIdentifier, endResidueId: PolyResidueIdentifier, info?: any);
    }
    class SymmetryInfo {
        spacegroupName: string;
        cellSize: number[];
        cellAngles: number[];
        toFracTransform: number[];
        isNonStandardCrytalFrame: boolean;
        constructor(spacegroupName: string, cellSize: number[], cellAngles: number[], toFracTransform: number[], isNonStandardCrytalFrame: boolean);
    }
    /**
     * Wraps an assembly operator.
     */
    class AssemblyOperator {
        id: string;
        name: string;
        operator: number[];
        constructor(id: string, name: string, operator: number[]);
    }
    /**
     * Wraps an assembly generation template.
     */
    class AssemblyGen {
        name: string;
        operators: string[][];
        asymIds: string[];
        constructor(name: string, operators: string[][], asymIds: string[]);
    }
    /**
     * Information about the assemblies.
     */
    class AssemblyInfo {
        operators: {
            [id: string]: AssemblyOperator;
        };
        assemblies: AssemblyGen[];
        constructor(operators: {
            [id: string]: AssemblyOperator;
        }, assemblies: AssemblyGen[]);
    }
    interface PositionTableSchema extends DataTable {
        x: number[];
        y: number[];
        z: number[];
    }
    interface DefaultAtomTableSchema extends DataTable {
        id: number[];
        name: string[];
        elementSymbol: string[];
        x: number[];
        y: number[];
        z: number[];
        altLoc: string[];
        occupancy: number[];
        tempFactor: number[];
        rowIndex: number[];
        residueIndex: number[];
        chainIndex: number[];
        entityIndex: number[];
    }
    interface DefaultResidueTableSchema extends DataTable {
        name: string[];
        seqNumber: number[];
        asymId: string[];
        authName: string[];
        authSeqNumber: number[];
        authAsymId: string[];
        insCode: string[];
        entityId: string[];
        isHet: number[];
        atomStartIndex: number[];
        atomEndIndex: number[];
        chainIndex: number[];
        entityIndex: number[];
    }
    interface DefaultChainTableSchema extends DataTable {
        asymId: string[];
        authAsymId: string[];
        entityId: string[];
        atomStartIndex: number[];
        atomEndIndex: number[];
        residueStartIndex: number[];
        residueEndIndex: number[];
        entityIndex: number[];
        sourceChainIndex?: number[];
    }
    interface DefaultEntityTableSchema extends DataTable {
        entityId: string[];
        entityType: EntityType[];
        atomStartIndex: number[];
        atomEndIndex: number[];
        residueStartIndex: number[];
        residueEndIndex: number[];
        chainStartIndex: number[];
        chainEndIndex: number[];
        type: string[];
    }
    enum MoleculeModelSource {
        File = 0,
        Computed = 1,
    }
    class MoleculeModel {
        id: string;
        modelId: string;
        atoms: DefaultAtomTableSchema;
        residues: DefaultResidueTableSchema;
        chains: DefaultChainTableSchema;
        entities: DefaultEntityTableSchema;
        componentBonds: ComponentBondInfo;
        secondaryStructure: SecondaryStructureElement[];
        symmetryInfo: SymmetryInfo;
        assemblyInfo: AssemblyInfo;
        parent: MoleculeModel;
        source: MoleculeModelSource;
        private _queryContext;
        queryContext: Queries.QueryContext;
        query(q: Queries.Query): Queries.FragmentSeq;
        constructor(id: string, modelId: string, atoms: DefaultAtomTableSchema, residues: DefaultResidueTableSchema, chains: DefaultChainTableSchema, entities: DefaultEntityTableSchema, componentBonds: ComponentBondInfo, secondaryStructure: SecondaryStructureElement[], symmetryInfo: SymmetryInfo, assemblyInfo: AssemblyInfo, parent: MoleculeModel, source: MoleculeModelSource);
    }
    class Molecule {
        id: string;
        models: MoleculeModel[];
        constructor(id: string, models: MoleculeModel[]);
    }
}
declare namespace LiteMol.Core.Structure {
    class Spacegroup {
        info: Structure.SymmetryInfo;
        private temp;
        private tempV;
        private space;
        private operators;
        operatorCount: number;
        getOperatorMatrix(index: number, i: number, j: number, k: number, target: number[]): number[];
        private getSpace();
        private static getOperator(ids);
        private getOperators();
        constructor(info: Structure.SymmetryInfo);
    }
    namespace SpacegroupTables {
        var Transform: number[][];
        var Operator: number[][];
        var Group: number[][];
        var Spacegroup: {
            [key: string]: number;
        };
    }
}
declare namespace LiteMol.Core.Structure {
    function buildPivotGroupSymmetry(model: MoleculeModel, radius: number, pivotsQuery?: Queries.Query): MoleculeModel;
    function buildSymmetryMates(model: MoleculeModel, radius: number): MoleculeModel;
    function buildAssembly(model: MoleculeModel, assembly: AssemblyGen): MoleculeModel;
}
declare namespace LiteMol.Core.Structure.Queries {
    /**
     * The context of a query.
     *
     * Stores:
     * - the mask of "active" atoms.
     * - kd-tree for fast geometry queries.
     * - the molecule itself.
     *
     */
    class QueryContext {
        private _mask;
        private _count;
        private lazyTree;
        /**
         * Number of atoms in the current context.
         */
        atomCount: number;
        /**
         * Determine if the context contains all atoms of the input model.
         */
        isComplete: boolean;
        /**
         * The structure this context is based on.
         */
        structure: MoleculeModel;
        /**
         * Get a kd-tree for the atoms in the current context.
         */
        tree: Geometry.SubdivisionTree3D<number>;
        /**
         * Checks if an atom is included in the current context.
         */
        hasAtom(index: number): boolean;
        /**
         * Checks if an atom from the range is included in the current context.
         */
        hasRange(start: number, end: number): boolean;
        /**
         * Create a new context based on the provide structure.
         */
        static ofStructure(structure: MoleculeModel): QueryContext;
        /**
         * Create a new context from a sequence of fragments.
         */
        static ofFragments(seq: FragmentSeq): QueryContext;
        constructor(structure: MoleculeModel, mask: number[], count: number);
        private makeTree();
    }
    /**
     * The basic element of the query language.
     * Everything is represented as a fragment.
     */
    class Fragment {
        /**
         * The index of the first atom of the generator.
         */
        tag: number;
        /**
         * Indices of atoms.
         */
        atomIndices: number[];
        /**
         * The context the fragment belongs to.
         */
        context: QueryContext;
        private _hashCode;
        private _hashComputed;
        /**
         * The hash code of the fragment.
         */
        hashCode: number;
        /**
         * Id composed of <moleculeid>_<tag>.
         */
        id: string;
        /**
         * Number of atoms.
         */
        atomCount: number;
        /**
         * Determines if a fragment is HET based on the tag.
         */
        isHet: any;
        private _fingerprint;
        /**
         * A sorted list of residue identifiers.
         */
        fingerprint: string;
        private _authFingerprint;
        /**
         * A sorted list of residue identifiers.
         */
        authFingerprint: string;
        private _residueIndices;
        private _chainIndices;
        private _entityIndices;
        private computeIndices();
        /**
         * A sorted list of residue indices.
         */
        residueIndices: number[];
        /**
         * A sorted list of chain indices.
         */
        chainIndices: number[];
        /**
         * A sorted list of entity indices.
         */
        entityIndices: number[];
        static areEqual(a: Fragment, b: Fragment): boolean;
        /**
         * Create a fragment from an integer set.
         * Assumes the set is in the given context's mask.
         */
        static ofSet(context: QueryContext, atomIndices: Set<number>): Fragment;
        /**
         * Create a fragment from an integer array.
         * Assumes the set is in the given context's mask.
         * Assumes the array is sorted.
         */
        static ofArray(context: QueryContext, tag: number, atomIndices: Int32Array): Fragment;
        /**
         * Create a fragment from a single index.
         * Assumes the index is in the given context's mask.
         */
        static ofIndex(context: QueryContext, index: number): Fragment;
        /**
         * Create a fragment from a <start,end) range.
         * Assumes the fragment is non-empty in the given context's mask.
         */
        static ofIndexRange(context: QueryContext, start: number, endExclusive: number): Fragment;
        /**
         * Create a fragment from an integer set.
         */
        constructor(context: QueryContext, tag: number, atomIndices: number[]);
    }
    /**
     * A sequence of fragments the queries operate on.
     */
    class FragmentSeq {
        context: QueryContext;
        fragments: Fragment[];
        static empty(ctx: QueryContext): FragmentSeq;
        length: number;
        /**
         * Merges atom indices from all fragments.
         */
        unionAtomIndices(): number[];
        /**
         * Merges atom indices from all fragments into a single fragment.
         */
        unionFragment(): Fragment;
        constructor(context: QueryContext, fragments: Fragment[]);
    }
    /**
     * A builder that includes all fragments.
     */
    class FragmentSeqBuilder {
        private ctx;
        private fragments;
        add(f: Fragment): void;
        getSeq(): FragmentSeq;
        constructor(ctx: QueryContext);
    }
    /**
     * A builder that includes only unique fragments.
     */
    class HashFragmentSeqBuilder {
        private ctx;
        private fragments;
        private byHash;
        add(f: Fragment): this;
        getSeq(): FragmentSeq;
        constructor(ctx: QueryContext);
    }
    /**
     * The query is a mapping from a context to a sequence of fragments.
     */
    type Query = (ctx: QueryContext) => FragmentSeq;
}
declare namespace LiteMol.Core.Structure.Queries {
    interface IQueryBuilder {
        ambientResidues(radius: number): IQueryBuilder;
        wholeResidues(): IQueryBuilder;
        union(): IQueryBuilder;
        inside(where: IQueryBuilder): IQueryBuilder;
        compile(): Query;
    }
    class QueryBuilder implements IQueryBuilder {
        private compiler;
        ambientResidues(radius: number): QueryBuilder;
        wholeResidues(): IQueryBuilder;
        union(): IQueryBuilder;
        inside(where: IQueryBuilder): IQueryBuilder;
        compile(): (ctx: QueryContext) => FragmentSeq;
        static extend(name: string, compilerProvider: (builder: QueryBuilder) => () => Query): void;
        static build(compiler: () => Query): IQueryBuilder;
        constructor(compiler: () => Query);
    }
    interface EntityIdSchema {
        entityId?: string;
        type?: string;
    }
    interface AsymIdSchema extends EntityIdSchema {
        asymId?: string;
        authAsymId?: string;
    }
    interface ResidueIdSchema extends AsymIdSchema {
        name?: string;
        seqNumber?: number;
        authName?: string;
        authSeqNumber?: number;
        insCode?: string;
    }
    /**
     * Generator queries such as atoms* or residues*
     */
    namespace Generators {
        function residues(...ids: ResidueIdSchema[]): IQueryBuilder;
        function chains(...ids: AsymIdSchema[]): IQueryBuilder;
        function entities(...ids: EntityIdSchema[]): IQueryBuilder;
        function notEntities(...ids: EntityIdSchema[]): IQueryBuilder;
        function everything(): IQueryBuilder;
        function chainsFromIndices(...indices: number[]): IQueryBuilder;
        function entitiesFromIndices(...indices: number[]): IQueryBuilder;
        function residuesFromIndices(...indices: number[]): IQueryBuilder;
        function sequence(entityId: string, asymId: string, startId: ResidueIdSchema, endId: ResidueIdSchema): IQueryBuilder;
        function hetGroups(): IQueryBuilder;
        function cartoons(): IQueryBuilder;
        function backbone(): IQueryBuilder;
        function sidechain(): IQueryBuilder;
        function atomsInBox(min: {
            x: number;
            y: number;
            z: number;
        }, max: {
            x: number;
            y: number;
            z: number;
        }): IQueryBuilder;
        function or(...elements: QueryBuilder[]): IQueryBuilder;
    }
    /**
     * Query compilation wrapper.
     */
    namespace Compiler {
        function compileEverything(): (ctx: QueryContext) => FragmentSeq;
        function compileFromIndices(complement: boolean, indices: number[], tableProvider: (molecule: Structure.MoleculeModel) => {
            atomStartIndex: number[];
            atomEndIndex: number[];
        } & Structure.DataTable): Query;
        function compileAtomRanges(complement: boolean, ids: ResidueIdSchema[], tableProvider: (molecule: Structure.MoleculeModel) => {
            atomStartIndex: number[];
            atomEndIndex: number[];
        } & Structure.DataTable): Query;
        function compileSequence(entityId: string, asymId: string, start: ResidueIdSchema, end: ResidueIdSchema): Query;
        function compileHetGroups(): Query;
        function compileAtomsInBox(min: {
            x: number;
            y: number;
            z: number;
        }, max: {
            x: number;
            y: number;
            z: number;
        }): Query;
        function compileInside(what: Query, where: Query): Query;
        function compileFilter(what: Query, filter: (f: Fragment) => boolean): Query;
        function compileOr(queries: Query[]): (ctx: QueryContext) => FragmentSeq;
        function compileUnion(what: Query): Query;
        function compilePolymerNames(names: string[], complement: boolean): Query;
        function compileAmbientResidues(where: Query, radius: number): (ctx: QueryContext) => FragmentSeq;
        function compileWholeResidues(where: Query): (ctx: QueryContext) => FragmentSeq;
    }
}
declare namespace LiteMol.Core.Utils {
    function extend<S, T, U>(object: S, source: T, guard?: U): S & T & U;
    function updateClone<S, T>(object: S, source: T): S & T;
    function shallowEqual<T>(a: T, b: T): boolean;
    function shallowClone<T>(o: T): T;
    function debounce<T>(func: () => T, wait: number): () => T;
}
declare namespace LiteMol.Core.Utils {
    /**
     * A a JS native array with the given size.
     */
    function makeNativeIntArray(size: number): number[];
    /**
     * A a JS native array with the given size.
     */
    function makeNativeFloatArray(size: number): number[];
    /**
     * A generic chunked array builder.
     */
    class ChunkedArrayBuilder<T> {
        private creator;
        private elementSize;
        private chunkSize;
        private current;
        private currentIndex;
        parts: any[];
        elementCount: number;
        add4(x: T, y: T, z: T, w: T): number;
        add3(x: T, y: T, z: T): number;
        add2(x: T, y: T): number;
        add(x: T): number;
        compact(): T[];
        static forVertex3D(chunkVertexCount?: number): ChunkedArrayBuilder<number>;
        static forIndexBuffer(chunkIndexCount?: number): ChunkedArrayBuilder<number>;
        static forTokenIndices(chunkTokenCount?: number): ChunkedArrayBuilder<number>;
        static forIndices(chunkTokenCount?: number): ChunkedArrayBuilder<number>;
        static forInt32(chunkSize?: number): ChunkedArrayBuilder<number>;
        static forFloat32(chunkSize?: number): ChunkedArrayBuilder<number>;
        static forArray<TElement>(chunkSize?: number): ChunkedArrayBuilder<TElement>;
        constructor(creator: (size: number) => any, chunkElementCount: number, elementSize: number);
    }
    /**
     * Static size array builder.
     */
    class ArrayBuilder<T> {
        private currentIndex;
        elementCount: number;
        array: T[];
        add3(x: T, y: T, z: T): void;
        add2(x: T, y: T): void;
        add(x: T): void;
        static forVertex3D(count: number): ArrayBuilder<number>;
        static forIndexBuffer(count: number): ArrayBuilder<number>;
        static forTokenIndices(count: number): ArrayBuilder<number>;
        static forIndices(count: number): ArrayBuilder<number>;
        static forInt32(count: number): ArrayBuilder<number>;
        static forFloat32(count: number): ArrayBuilder<number>;
        static forArray<TElement>(count: number): ArrayBuilder<TElement>;
        constructor(creator: (size: number) => any, chunkElementCount: number, elementSize: number);
    }
}
declare namespace LiteMol.Core.Utils {
    /**
     * Efficient integer and float parsers.
     *
     * For the purposes of parsing numbers from the mmCIF data representations,
     * up to 4 times faster than JS parseInt/parseFloat.
     */
    class FastNumberParsers {
        static parseInt(str: string, start: number, end: number): number;
        static parseScientific(main: number, str: string, start: number, end: number): number;
        static parseFloat(str: string, start: number, end: number): number;
    }
}
declare namespace LiteMol.Core.Utils {
    class PerformanceMonitor {
        private starts;
        private ends;
        static currentTime(): number;
        start(name: string): void;
        end(name: string): void;
        static format(t: number): string;
        formatTime(name: string): string;
        formatTimeSum(...names: string[]): string;
        time(name: string): number;
        timeSum(...names: string[]): number;
    }
}
declare module 'LiteMol-core' {
    import __Core = LiteMol.Core;
    export = __Core;
}
