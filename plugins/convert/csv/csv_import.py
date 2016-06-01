import json
from Bio import SeqIO
import uuid
import csv

# This table converts annotation types in genbank to role_types in our tool
# Ex: if genbank says "gene", turn it into an role_type of "cds" as we import
role_type_table = {
    "CDS": "cds",
    "regulatory": "promoter", #promoter is actually a subclass of regulatory
    "promoter": "promoter",
    "terminator": "terminator",
    "gene": "cds",
    "mat_peptide": "cds"
}

# Creates a scaffold structure for a block
def create_block_json(id, sequence, features):
    return {
        "id": id,
        "metadata" : {},
        "rules": {},
        "components": [],
        "sequence" : {
            "sequence": sequence,
            "features": features
        }
      }

# Validates a particular line in the csv file. Returns the error or "Ok"
def validate_line(line):
    if ("Name" not in line and "Role" not in line and "Sequence" not in line) or \
       (line["Name"] == "" and line["Role"] == "" and line["Sequence"] == "")
        return "All lines must have a name, a role or a sequence"
    return "Ok"


# Given a structure representing a line in the csv file, create a block
def line_to_block(line):
    block_id = str(uuid.uuid4())
    sequence = ""
    if "Sequence" in line:
        sequence = line["Sequence"]
    block = create_block_json(block_id, sequence, [])
    if "Name" in line:
        block["metadata"]["name"] = line["Name"]
    if "Description" in line:
        block["metadata"]["description"] = line["Description"]
    if "Role" in line:
        block["rules"]["role"] = line["Role"].lower()
    if "Color" in line:
        block["metadata"]["color"] = line["Color"]
    return {"id": block_id, "block": block}

# Given a file, create project and blocks structures to import into GD
def csv_to_project(filename):
    root_id = str(uuid.uuid4())
    root_block = create_block_json(root_id, "", [])

    blocks = { root_id: root_block }
    project = { "components": [root_id]}

    with open(filename, "rb" ) as theFile:
        reader = csv.DictReader(theFile)
        for line in reader:
            # line is { 'Name': 'w0', 'Description': 'Block Description', 'Role': 'Promoter', 'Color': '#434454', 'Sequence': 'actgtg' }
            # Everything is optional - Must have one of Name, Role or Sequence
            validation = validate_line(line)
            if validation == "Ok":
                new_block = line_to_block(line)
            else:
                return validation
            blocks[new_block["id"]] = new_block["block"]
            root_block["components"].append(new_block["id"])
    return { "project": project, "blocks": blocks }
