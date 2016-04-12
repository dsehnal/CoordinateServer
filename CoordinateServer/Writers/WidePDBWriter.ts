import * as Core from 'LiteMol-core';
import StringWriter from './StringWriter'

import Cif = Core.Formats.Cif;


class AtomSiteWriter {

    serial = 1;

    recordName: Cif.Column;
    name: Cif.Column;
    altLoc: Cif.Column;
    resName: Cif.Column;
    chainId: Cif.Column;
    resSeq: Cif.Column;
    iCode: Cif.Column;
    x: Cif.Column;
    y: Cif.Column;
    z: Cif.Column;
    occupancy: Cif.Column;
    tempFactor: Cif.Column;
    element: Cif.Column;
    charge: Cif.Column;

    wasHET = false;

    private writeRecord(i: number, writer: StringWriter) {

        //Start		Width		End		Data Type		Field		CIF field
        //1		6		6		Record Name		ATOM/ HETATM		_atom_site.group_PDB
        let recordName = this.recordName.getString(i);
        if (!recordName) recordName = "ATOM";
        writer.writePadRight(recordName, 6);

        this.wasHET = recordName === "HETATM";

        //7		9		15		Integer		Serial		computed
        writer.writeIntegerPadLeft(this.serial++, 9);

        //16		1		16		empty				
        writer.whitespace(1);

        //17		4		20		Atom		name		_atom_site.auth_atom_id
        let name = this.name.getString(i);
        if (name.length < 3) writer.writePadRight(" " + name, 4);
        else writer.writePadLeft(name, 4);
        
        //21		1		21		Char		altLoc		_atom_site.auth_alt_id
        let altLoc = this.altLoc.getString(i);
        if (!altLoc) writer.write(" ");
        else if (altLoc.length > 1) writer.write(altLoc.substr(0, 1));
        else if (altLoc.length === 1) writer.write(altLoc);
        else writer.write(" ");

        //22		20		41		Residue Name		resName		_atom_site.auth_comp_id
        writer.writePadRight(this.resName.getString(i), 20);


        //42		1		42		empty				
        writer.whitespace(1);

        //43		16		58		Chain Name		chainId		_atom_site.auth_asym_id
        writer.writePadRight(this.chainId.getString(i), 20);
        
        //59		9		67		Integer		resSeq		_atom_site.auth_seq_id
        writer.writeIntegerPadLeft(this.resSeq.getInteger(i), 9);

        //68		1		68		Char		iCode		_atom_site.pdbx_PDB_ins_code
        let iCode = this.iCode.getString(i);
        if (!iCode) writer.write(" ");
        else if (iCode.length > 1) writer.write(iCode.substr(0, 1));
        else if (iCode.length === 1) writer.write(iCode);
        else writer.write(" ");
        
        //69		1		69		empty				
        writer.whitespace(1);

        //70		10		79		Real 10.3		x		_atom_site.Cartn_x
        writer.writePadLeft(this.x.getFloat(i).toFixed(3), 10);

        //80		10		89		Real 10.3		y		_atom_site.Cartn_y
        writer.writePadLeft(this.y.getFloat(i).toFixed(3), 10);

        //90		10		99		Real 10.3		z		_atom_site.Cartn_z
        writer.writePadLeft(this.y.getFloat(i).toFixed(3), 10);
        
        //100		6		105		Real 6.2		occupancy		_atom_site.occupancy
        if (this.occupancy.isUndefined(i)) writer.whitespace(6); 
        else writer.writePadLeft(this.occupancy.getFloat(i).toFixed(2), 6);


        //106		6		111		Real 6.2		tempFactor		_atom_site.B_iso_or_equiv
        if (this.tempFactor.isUndefined(i)) writer.whitespace(6);
        else writer.writePadLeft(this.tempFactor.getFloat(i).toFixed(2), 6);

        //112		4		115		LStr 4		segId		unused
        writer.whitespace(4);

        //116		2		117		LStr 2		element		_atom_site.type_symbol
        writer.writePadRight(this.element.getString(i), 2);

        //118		2		119		LStr 2		charge		_atom_site.pdbx_formal_charge
        if (this.charge.isUndefined(i)) writer.whitespace(2);
        else writer.writePadRight(this.charge.getString(i), 2);
        
        writer.newline();
    }

    private writeTer(i: number, writer: StringWriter) {


        //TER
        //1		6		6		Record Name		TER		
        writer.write("TER   ");

        //7		9		15		Integer		Serial		computed
        writer.writeIntegerPadLeft(this.serial++, 9);

        //16		1		16		empty				
        //17		4		20		empty (skip name)
        //21		1		21		empty (skip altloc)
        writer.whitespace(6);
        
        //22		20		41		Residue Name		resName		_atom_site.auth_comp_id
        writer.writePadRight(this.resName.getString(i), 20);


        //42		1		42		empty				
        writer.whitespace(1);

        //43		16		58		Chain Name		chainId		_atom_site.auth_asym_id
        writer.writePadRight(this.chainId.getString(i), 20);

        //59		9		67		Integer		resSeq		_atom_site.auth_seq_id
        writer.writeIntegerPadLeft(this.resSeq.getInteger(i), 9);

        //68		1		68		Char		iCode		_atom_site.pdbx_PDB_ins_code
        let iCode = this.iCode.getString(i);
        if (!iCode) writer.write(" ");
        else if (iCode.length > 1) writer.write(iCode.substr(0, 1));
        else if (iCode.length === 1) writer.write(iCode);
        else writer.write(" ");

        writer.newline();

        this.wasHET = false;
    }

    write(writer: StringWriter) {

        let previous = 0;

        let modelCol = this.atoms.getColumn("_atom_site.pdbx_PDB_model_num").index;
        let authAsymIdCol = this.atoms.getColumn("_atom_site.auth_asym_id").index;
        let recordTypeCol = this.atoms.getColumn("_atom_site.group_PDB").index;

        let currentModel = new StringWriter();
        let models: StringWriter[] = [currentModel];
        
        for (let i = 0, _b = this.atoms.rowCount; i < _b; i++) {

            try {

                if (!this.wasHET &&
                    (this.atoms.valueEqual(recordTypeCol, i, "HETATM") ||
                        !this.atoms.areTokensEqual(this.atoms.getTokenIndex(previous, authAsymIdCol), this.atoms.getTokenIndex(i, authAsymIdCol)))) {
                    this.writeTer(i - 1, currentModel);
                }

                this.writeRecord(i, currentModel);


                if (!this.atoms.areTokensEqual(this.atoms.getTokenIndex(previous, modelCol), this.atoms.getTokenIndex(i, modelCol))) {

                    if (!this.wasHET) this.writeTer(i, currentModel);

                    currentModel = new StringWriter();
                    this.serial = 1;
                    models[models.length] = currentModel;
                }

                previous = i;
            } catch (e) {
            
                console.log('' + e);
                console.log('at atom ' + i);
                break;
            }
        }

        if (!this.wasHET) this.writeTer(previous, currentModel);

        if (models.length === 1) {
            writer.appendWriter(currentModel);
        } else {

            for (let i = 0; i < models.length; i++) {
                writer.write("MODEL ");
                writer.whitespace(4);
                writer.writeInteger(i + 1);
                writer.newline();

                writer.appendWriter(models[i]);

                writer.write("ENDMDL");
                writer.newline();
            }
        }        
    }

    constructor(private atoms: Cif.Category) {
        this.recordName = atoms.getColumn("_atom_site.group_PDB");
        this.name = atoms.getColumn("_atom_site.auth_atom_id");
        this.altLoc = atoms.getColumn("_atom_site.label_alt_id");
        this.resName = atoms.getColumn("_atom_site.auth_comp_id");
        this.chainId = atoms.getColumn("_atom_site.auth_asym_id");
        this.resSeq = atoms.getColumn("_atom_site.auth_seq_id");
        this.iCode = atoms.getColumn("_atom_site.pdbx_PDB_ins_code");
        this.x = atoms.getColumn("_atom_site.Cartn_x");
        this.y = atoms.getColumn("_atom_site.Cartn_y");
        this.z = atoms.getColumn("_atom_site.Cartn_z");
        this.occupancy = atoms.getColumn("_atom_site.occupancy");
        this.tempFactor = atoms.getColumn("_atom_site.B_iso_or_equiv");
        this.element = atoms.getColumn("_atom_site.type_symbol");
        this.charge = atoms.getColumn("_atom_site.pdbx_formal_charge");
    }
}

export default class WidePDBWriter {

    private writeCryst1(writer: StringWriter) {

        let cell = this.data.getCategory("_cell");
        let symmetry = this.data.getCategory("_symmetry");

        if (!cell || !symmetry) return;

        //1		6		6		Record name		CRYST1		
        writer.write("CRYST1");

        //7		9		15		Real 9.3		a		_cell.length_a
        writer.writePadLeft(cell.getColumn("_cell.length_a").getFloat(0).toFixed(3), 9);

        //16		9		24		Real 9.3		b		_cell.length_b
        writer.writePadLeft(cell.getColumn("_cell.length_b").getFloat(0).toFixed(3), 9);

        //25		9		33		Real 9.3		c		_cell.length_c
        writer.writePadLeft(cell.getColumn("_cell.length_c").getFloat(0).toFixed(3), 9);

        //34		7		40		Real 7.2		alpha		_cell.angle_alpha
        writer.writePadLeft(cell.getColumn("_cell.angle_alpha").getFloat(0).toFixed(2), 7);

        //41		7		47		Real 7.2		beta		_cell.angle_beta
        writer.writePadLeft(cell.getColumn("_cell.angle_beta").getFloat(0).toFixed(2), 7);

        //48		7		54		Real 7.2		gamma		_cell.angle_gamma
        writer.writePadLeft(cell.getColumn("_cell.angle_gamma").getFloat(0).toFixed(2), 7);

        //55		1		55		empty				
        writer.whitespace(1);

        //56		11		66		LStr		space group		_symmetry.space_group_name_H-M
        writer.writePadLeft(symmetry.getColumn("_symmetry.space_group_name_H-M").getString(0), 11);

        //67		4		70		Int		Z value		_cell.Z_PDB
        writer.writeIntegerPadLeft(cell.getColumn("_cell.Z_PDB").getInteger(0), 4);

        writer.newline();
    }

    private writeHeader(writer: StringWriter) {

        //PDBSRC		source pdb id						
        //1		6		6		Record name		PDBSRC
        writer.write("PDBSRC");

        //7		6		12		empty		
        writer.whitespace(6);

        //13	16	    28		PDB id		id
        writer.write(this.data.header);

        writer.newline();

        let cat = this.data.getCategory("_pdbx_database_PDB_obs_spr");

        if (!cat) return;

        let col = cat.getColumn("_pdbx_database_PDB_obs_spr.replace_pdb_id");

        if (!col) return;

        let ids = col.getString(0).split(' ');

        for (let i = 0, o = 0; i < ids.length; i++) {
            if (!ids[i].length) continue;

            //PDBOBS		ids of obsolete entries to create this one						
            //1		6		6		Record Name		PDBOBS
            writer.write("PDBOBS");
            
            //7		1		7		empty		
            writer.whitespace(1);

            //8		4		11		Index		entryindex
            writer.writeIntegerPadLeft(++o, 4);

            //12		1		12		empty	
            writer.whitespace(1);

            //13		4		16		String		pdbid
            writer.write(ids[i].toUpperCase());

            writer.newline();
        }

    }


    write() {

        let writer = new StringWriter();

        let sites = new AtomSiteWriter(this.data.getCategory("_atom_site"));

        this.writeHeader(writer);
        this.writeCryst1(writer);
        sites.write(writer);
        writer.write("END");
        writer.finalize();
        
        return writer;
    }

    constructor(private data: Cif.Block) {
    }
} 