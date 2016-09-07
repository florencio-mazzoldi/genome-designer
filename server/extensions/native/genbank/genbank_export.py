from Bio import Seq
from Bio import SeqIO
from Bio import SeqFeature
from genbank_import import name_qualifier_table
import json

def is_filler(block):
    # It's a filler block when it has no name, it has a sequence, and no color
    return block["metadata"]["name"] == "" and ("sequence" in block and "sequence" in block["sequence"] and block["sequence"]["sequence"] != "") \
           and ("initialBases" in block["metadata"] and block["metadata"]["initialBases"] != "")

def convert_block_name(sf, block):
    # The name of the feature should go in the appropriate place in genbank
    if "name" in block["metadata"] and block["metadata"]["name"] != "":
        if "genbank" in block["metadata"] and "name_source" in block["metadata"]["genbank"]:
            sf.qualifiers[block["metadata"]["genbank"]["name_source"]] = block["metadata"]["name"]
        else:
            genbank_type = sf.type.lower()
            if genbank_type in name_qualifier_table and len(name_qualifier_table[genbank_type]) != 0:
                sf.qualifiers[name_qualifier_table[genbank_type][0]] = block["metadata"]["name"]
            # Unfortunately if the name doesn't fit in genbank we have to drop it!

def add_GC_info(sf, block, allblocks):
    encoded_data = { "GC": {} }

    encoded_data["GC"]["name"] = block["metadata"]["name"]

    # The color
    if "color" in block["metadata"] and block["metadata"]["color"] != "":
        encoded_data["GC"]["color"] = block["metadata"]["color"]

    # The description in the GD_Description qualifier
    if "description" in block["metadata"] and block["metadata"]["description"] != "":
        encoded_data["GC"]["description"] = block["metadata"]["description"]

    encoded_data["GC"]["id"] = block["id"]

    if len(block["components"]) > 0:
        encoded_data["GC"]["children"] = get_children_ids(block, allblocks)

    if "genbank" in block["metadata"] and "note" in block["metadata"]["genbank"]:
        encoded_data["note"] = block["metadata"]["genbank"]["note"]

    sf.qualifiers["note"] = json.dumps(encoded_data).replace("\"", "'").replace("\n", " ")

def add_features(block, allblocks, gb, start):
    # Disregard fillers... don't create features for them
    if is_filler(block):
        return start + block["sequence"]["length"] + 1

    # Add Myself as a feature
    sf = SeqFeature.SeqFeature()
    # Set the type based on the original type or the role type
    if "genbank" in block["metadata"] and "type" in block["metadata"]["genbank"]:
        sf.type = block["metadata"]["genbank"]["type"]
    elif "rules" in block and "role" in block["rules"] and block["rules"]["role"] is not None and block["rules"]["role"] != "":
        sf.type = block["rules"]["role"]
    else:
        sf.type = "misc_feature"

    # Set up the location of the feature
    feature_strand = 1
    if "strand" in block["metadata"]:
        feature_strand = block["metadata"]["strand"]

    # And copy all the other qualifiers that came originally from genbank
    if "genbank" in block["metadata"]:
        for annot_key, annot_value in block["metadata"]["genbank"].iteritems():
            if annot_key not in ["name_source", "note"]:
                sf.qualifiers[annot_key] = annot_value

    convert_block_name(sf, block)

    add_GC_info(sf, block, allblocks)

    convert_annotations(block, gb, start)

    # Add my children as features
    child_start = start
    for i in range(0, len(block["components"])):
        block_id = block["components"][i]
        bl = [b for b in allblocks if b["id"] == block_id][0]
        child_start = add_features(bl, allblocks, gb, child_start)

    if child_start != start:
        # The end is where the last child ended...
        end = child_start
    else:
        # No children, look at the block's length
        end = start + block["sequence"]["length"]

    sf.location = SeqFeature.FeatureLocation(start, end, strand=feature_strand)
    gb.features.append(sf)

    return end

# Parameters: the block to take annotations from,
# the biopython SeqRecord object to add the annotations to,
# the start position of the current block
def convert_annotations(block, gb, start):
    # Add My annotations as features
    for annotation in block["sequence"]["annotations"]:
        gb_annot = SeqFeature.SeqFeature()
        annotation_type = "misc_feature"

        if "role" in annotation and annotation["role"] != "":
            annotation_type = annotation["role"]

        for key, value in annotation.iteritems():
            if key not in ["start", "end", "notes", "strand", "color", "role", "isForward"]:
                gb_annot.qualifiers[key] = value
            elif key == "notes" and "genbank" in annotation["notes"]:
                for gb_key, gb_value in annotation["notes"]["genbank"].iteritems():
                    if gb_key not in ["type", "note"]:
                        gb_annot.qualifiers[gb_key] = gb_value
                    elif gb_key == "type":
                        annotation_type = gb_value

        gc_info = { "GC": { "name": annotation["name"] } }
        if "color" in annotation:
            gc_info["GC"]["color"] = annotation["color"]
        if "notes" in annotation and "genbank" in annotation["notes"] and "note" in annotation["notes"]["genbank"]:
            gc_info["note"] = annotation["notes"]["genbank"]["note"]
        gb_annot.qualifiers["note"] = json.dumps(gc_info).replace("\"", "'")

        if "start" in annotation:
            strand = 1
            if "isForward" in annotation and annotation["isForward"] == -1:
                strand = -1
            # Remember: annotations start and end are relative to the block
            gb_annot.location = SeqFeature.FeatureLocation(annotation["start"] + start, annotation["end"] + start + 1, strand)

        gb_annot.type = annotation_type

        gb.features.append(gb_annot)


# Return the full sequence from a block,
# building it from the sequence of children
def build_sequence(block, allblocks):
    seq = ""
    if len(block["components"]) > 0:
        for component in block["components"]:
            block = [b for b in allblocks if b["id"] == component][0]
            seq = seq + build_sequence(block, allblocks)
    else:
        if "sequence" in block["sequence"] and block["sequence"]["sequence"]:
            seq = block["sequence"]["sequence"]
    return seq

def get_children_ids(block, allblocks):
    # Remove filler blocks from the list of children ids! Then add the children ids to the genbank file
    children = list(block["components"])
    for child_id in block["components"]:
        child_block = [b for b in allblocks if b["id"] == child_id][0]
        if is_filler(child_block):
            children.remove(child_id)
    return children

# Take a project structure and a list of all the current blocks, convert this data to a genbank file and store it
# in filename.
def project_to_genbank(filename, project, allblocks):
    blocks = project["components"]
    seq_obj_lst = []

    # For each of the construct in the project
    for block_id in blocks:
        block = [b for b in allblocks if b["id"] == block_id][0]
        if not block:
            continue

        # Grab the original ID that came from genbank before if available, otherwise the GD Name as the name
        if "genbank" in block["metadata"] and "id" in block["metadata"]["genbank"]:
            genbank_id = block["metadata"]["genbank"]["id"]
        elif "genbank" in block["metadata"] and "name" in block["metadata"]["genbank"]:
            genbank_id = block["metadata"]["genbank"]["name"]
        else:
            genbank_id = "GC_DNA"

        sequence = build_sequence(block, allblocks)
        seq_obj = SeqIO.SeqRecord(Seq.Seq(sequence,Seq.Alphabet.DNAAlphabet()), genbank_id)

        # Create a 'source' feature
        sf = SeqFeature.SeqFeature()
        sf.type = "source"
        sf.location = SeqFeature.FeatureLocation(0, len(seq_obj.seq))

        add_GC_info(sf, block, allblocks)

        if "genbank" in block["metadata"]:
            # Set up all the annotations in the genbank record. These came originally from genbank.
            if "annotations" in block["metadata"]["genbank"]:
                for annot_key, annot_value in block["metadata"]["genbank"]["annotations"].iteritems():
                    seq_obj.annotations[annot_key] = annot_value
            # Set up all the references in the genbank record. These came originally from genbank.
            if "references" in block["metadata"]["genbank"]:
                for ref in block["metadata"]["genbank"]["references"]:
                    genbank_ref = SeqFeature.Reference()
                    genbank_ref.authors = ref['authors']
                    genbank_ref.comment = ref['comment']
                    genbank_ref.consrtm = ref['consrtm']
                    genbank_ref.journal = ref['journal']
                    genbank_ref.medline_id = ref['medline_id']
                    genbank_ref.pubmed_id = ref['pubmed_id']
                    genbank_ref.title = ref['title']
                    if "references" not in seq_obj.annotations:
                        seq_obj.annotations["references"] = []
                    seq_obj.annotations["references"].append(genbank_ref)
            # Add the original annotations to the source feature
            if "feature_annotations" in block["metadata"]["genbank"]:
                for annot_key, annot_value in block["metadata"]["genbank"]["feature_annotations"].iteritems():
                    sf.qualifiers[annot_key] = annot_value

        seq_obj.features.append(sf)

        if "description" in block["metadata"]:
            seq_obj.description = block["metadata"]["description"]
        if "genbank" in block["metadata"] and "name" in block["metadata"]["genbank"]:
            seq_obj.name = block["metadata"]["genbank"]["name"]
        elif "name" in block["metadata"]:
            seq_obj.name = block["metadata"]["name"].replace(" ", "")[:5]
        else:
            seq_obj.name = "GC_DNA"

        convert_annotations(block, seq_obj, 0)

        # Add a block for each of the features, recursively
        start = 0
        for child_id in block['components']:
            child_block = [b for b in allblocks if b["id"] == child_id][0]
            start = add_features(child_block, allblocks, seq_obj, start)

        seq_obj_lst.append(seq_obj)

    print('file is')
    print(filename)
    SeqIO.write(seq_obj_lst, open(filename, "w"), "genbank")
