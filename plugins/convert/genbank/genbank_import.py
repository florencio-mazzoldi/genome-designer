import json
from Bio import SeqIO
import uuid

# This table converts annotation types in genbank to role_types in our tool
# Ex: if genbank says "gene", turn it into an role_type of "cds" as we import
role_type_table = {
    "CDS": "cds",
    "regulatory": "promoter", #promoter is actually a subclass of regulatory
    "promoter": "promoter",
    "terminator": "terminator",
    "gene": "cds",
    "mat_peptide": "cds",
    "rep_origin": "originReplication",
    "rbs": "rbs"
}

# Creates a scaffold structure for a block
def create_block_json(id, sequence, features):
    return {
        "id": id,
        "metadata" : { "genbank" : {}},
        "rules": {},
        "components": [],
        "sequence" : {
            "sequence": sequence,
            "features": features
        }
      }

# Determines the kind of relationship between 2 blocks, using only the length, start and end positions
# Output can be:
#    "child": block1 is completely inside block2
#    "equal": block1 and block2 overlap perfectly
#    "parent": block2 is completely inside block1
#    "partial": block1 and block2 have a partial overlap
#    "before": block1 comes before than block2 in the sequence
#    "after": block1 comes after block2 in the sequence
def relationship(block1, block2, full_size):
    if block1["sequence"]["length"] < block2["sequence"]["length"] and block2["metadata"]["start"] <= block1["metadata"]["start"] and block2["metadata"]["end"] >= block1["metadata"]["end"]:
        return "child"
    if block1["sequence"]["length"] == block2["sequence"]["length"] and block2["metadata"]["start"] == block1["metadata"]["start"] and block2["metadata"]["end"] == block1["metadata"]["end"]:
        return "equal"
    if block1["sequence"]["length"] > block2["sequence"]["length"] and block1["metadata"]["start"] <= block2["metadata"]["start"] and block1["metadata"]["end"] >= block2["metadata"]["end"]:
        return "parent"
    if (block1["metadata"]["start"] <= block2["metadata"]["start"] and block1["metadata"]["end"] >= block2["metadata"]["start"]) or \
        (block1["metadata"]["start"] <= block2["metadata"]["end"] and block1["metadata"]["end"] >= block2["metadata"]["end"]):
        return "partial"
    if block1["metadata"]["end"]-1 < block2["metadata"]["start"]:
        return "before"
    if block1["metadata"]["start"] > block2["metadata"]["end"]-1:
        return "after"
    raise Exception("This relationship between blocks can never happen")
    return "disjoint"

# Takes a block and makes it a feature of another block, instead of a full block on itself.
# This function takes all the children of the block to embed in the parent and in turn makes THEM
# also features of the parent.
# Parameters: An array with all the blocks, the block to convert, the parent it should be a feature of,
# and a list of IDs of blocks that need to be removed.
# The function does NOT take the blocks from all_blocks
def convert_block_to_feature(all_blocks, to_convert, parent, to_remove_list):
    feature = { "name": "", "notes": {} }
    for key, value in to_convert["metadata"].iteritems():
        if key in ["name", "description", "start", "end", "tags"]:
            feature[key] = value
        elif key == "strand":
            feature["isForward"] = (value == 1)
        else:
            feature["notes"][key] = value

    #feature["sequence"] = to_convert["sequence"]["sequence"]

    if "annotations" not in parent["sequence"]:
        parent["sequence"]["annotations"] = []

    parent["sequence"]["annotations"].append(feature)
    to_remove_list.append(to_convert["id"])

    if "annotations" in to_convert["sequence"]:
        for annotation in to_convert["sequence"]["annotations"]:
            parent["sequence"]["annotations"].append(annotation)

    # And also convert to features all the components of the removed block, recursively
    for to_convert_child_id in to_convert["components"]:
        to_convert_child = all_blocks[to_convert_child_id]
        convert_block_to_feature(all_blocks, to_convert_child, parent, to_remove_list)

# Takes a genbank record and creates a root block
def create_root_block_from_genbank(gb, sequence):
    full_length = len(sequence)

    root_id = str(uuid.uuid4())
    root_block = create_block_json(root_id, sequence, [])
    root_block["metadata"]["description"] = gb.description
    root_block["metadata"]["name"] = gb.name
    root_block["metadata"]["start"] = 0
    root_block["metadata"]["end"] = full_length - 1
    root_block["metadata"]["genbank"]["id"] = gb.id
    root_block["sequence"]["length"] = full_length
    if "references" in gb.annotations:
        for ref in gb.annotations["references"]:
            if "references" not in root_block["metadata"]["genbank"]:
                root_block["metadata"]["genbank"]["references"] = []
            try:
                reference = {'authors': ref.authors, 'comment': ref.comment, 'consrtm': ref.consrtm, 'journal': ref.journal,
                             'medline_id': ref.medline_id, 'pubmed_id': ref.pubmed_id, 'title': ref.title}
                root_block["metadata"]["genbank"]["references"].append(reference)
            except:
                pass

    for annot in gb.annotations:
        if "annotations" not in root_block["metadata"]["genbank"]:
            root_block["metadata"]["genbank"]["annotations"] = {}
        try:
            json.dumps(gb.annotations[annot])
            root_block["metadata"]["genbank"]["annotations"][annot] = gb.annotations[annot]
        except:
            pass
    return root_block

# Takes a BioPython SeqFeature and turns it into a block
def create_child_block_from_feature(f, all_blocks, root_block, sequence):
    qualifiers = f.qualifiers
    start = f.location.start.position
    end = f.location.end.position
    strand = f.location.strand
    role_type = role_type_table.get(f.type)

    if f.type.strip() == 'source':
        # 'source' refers to the root block. So, the root block aggregates information
        # from the header of the genbank file as well as the 'source' feature
        for key, value in qualifiers.iteritems():
            if "feature_annotations" not in root_block["metadata"]["genbank"]:
                root_block["metadata"]["genbank"]["feature_annotations"] = {}
            if key == "GC_Id":
                del all_blocks[root_block["id"]]
                root_block["id"] = value[0]
                all_blocks[value[0]] = root_block
            elif key == "GC_Children":
                root_block["components"] = json.loads(value[0].replace("'", "\""))
            else:
                root_block["metadata"]["genbank"]["feature_annotations"][key] = value[0]
    else:
        # It's a regular annotation, create a block
        block_id = str(uuid.uuid4())
        child_block = create_block_json(block_id, sequence[start:end], [])
        for q in f.qualifiers:
            if q == "name":
                child_block["name"] = f.qualifiers[q][0]
            elif q  == "GC_Color":
                child_block["metadata"]["color"] = f.qualifiers[q][0]
            elif q  == "GC_Description":
                child_block["metadata"]["description"] = f.qualifiers[q][0]
            elif q == "GC_Id":
                block_id = f.qualifiers[q][0]
                child_block["id"] = f.qualifiers[q][0]
            elif q == "GC_Children":
                child_block["components"] = json.loads(f.qualifiers[q][0].replace("'", "\""))
            else:
                try:
                    json.dumps(qualifiers[q][0])
                    child_block["metadata"]["genbank"][q] = f.qualifiers[q][0]
                except:
                    pass
        child_block["metadata"]["start"] = start
        child_block["metadata"]["end"] = end - 1
        child_block["sequence"]["length"] = end - start
        child_block["metadata"]["strand"] = strand
        child_block["metadata"]["genbank"]["type"] = f.type

        if role_type:
            child_block["rules"]["role"] = role_type

        # Note the rules for the name of the block
        # The name is the string that appears on the UI when visualizing blocks.
        if "name" not in child_block:
            if "label" in f.qualifiers:
                child_block["metadata"]["name"] = f.qualifiers["label"][0]
            elif "product" in f.qualifiers:
                child_block["metadata"]["name"] = f.qualifiers["product"][0]
            elif role_type == 'cds' and "gene" in f.qualifiers:
                child_block["metadata"]["name"] = f.qualifiers["gene"][0]
            else:
                if role_type:
                    child_block["metadata"]["name"] = role_type
                elif f.type:
                    child_block["metadata"]["name"] = f.type

        all_blocks[block_id] = child_block

# Returns true if a block id is a children of any other block
def has_parent(block_id, all_blocks):
    for block in all_blocks.values():
        if block_id in block["components"]:
            return True
    return False

# Traverse an array of blocks and build a hierarchy. The hierarchy embeds blocks into other blocks in order,
# and create filler blocks where needed
def build_block_hierarchy(all_blocks, root_block, sequence):
    full_length = len(sequence)
    # Going through the blocks from shorter to longer, so hopefully we will maximize
    # the ones that convert to blocks instead of features

    # Hack to make Root the last one (beyond all the other ones with the same length)
    root_block["metadata"]["end"] = root_block["metadata"]["end"] + 1
    sorted_blocks = sorted(all_blocks.values(), key=lambda block: block["metadata"]["end"] - block["metadata"]["start"])
    root_block["metadata"]["end"] = root_block["metadata"]["end"] - 1

    blocks_count = len(sorted_blocks)
    to_remove = []

    for i in range(blocks_count):
        block = sorted_blocks[i]
        # Don't try to sort out the root block, anything to remove, or anything that we have already determined that it has a parent
        if block == root_block or block["id"] in to_remove or has_parent(block["id"], all_blocks):
            continue

        inserted = False

        parents = []
        # Look for all the possible parents of the current block
        for j in range(i + 1, blocks_count):
            # If it is a child of root, don't add it as child of any other block with the same size
            if sorted_blocks[j]["sequence"]["length"] == root_block["sequence"]["length"] and sorted_blocks[j] != root_block:
                continue

            if sorted_blocks[j]["metadata"]["end"] >= block["metadata"]["end"] and sorted_blocks[j]["metadata"]["start"] <= \
                    block["metadata"]["start"]:
                parents.append(sorted_blocks[j])

        for other_block in parents:
            rel = relationship(block, other_block, full_length)
            if rel == "child":
                i = 0
                is_partial_overlap = False
                # Go through the siblins to see where to insert the current block
                for sib_id in other_block["components"]:
                    sibling = all_blocks[sib_id]
                    relationship_to_sibling = relationship(block, sibling, full_length)
                    # Keep moving forward until we get to one where we need to be "before"
                    if relationship_to_sibling == "after":
                        i += 1
                    elif relationship_to_sibling != "before":  # Partial match!
                        is_partial_overlap = True
                        break
                # Insert the block where it goes
                if not is_partial_overlap:
                    other_block["components"].insert(i, block["id"])
                else:
                    # Partial match, make this block just an annotation of the parent
                    convert_block_to_feature(all_blocks, block, other_block, to_remove)
                inserted = True
                break
            elif rel == "equal":
                # If the blocks overlap, make the one with less amount of children the feature of
                # the other one
                if len(block["components"]) <= len(other_block["components"]):
                    convert_block_to_feature(all_blocks, block, other_block, to_remove)
                    inserted = True
                    break
                else:
                    convert_block_to_feature(all_blocks, other_block, block, to_remove)

        if not inserted:  # This should never happen because the block should be at least child of root!
            if block["sequence"]["length"] == root_block["sequence"]["length"]:
                convert_block_to_feature(all_blocks, block, root_block, to_remove)
            else:
                print('Error processing block ' + block["metadata"]["name"] + "[" + str(block["metadata"]["start"]) + ":" + str(block["metadata"]["end"]) + "]")

    # Delete all the blocks that were converted to features
    for removing in to_remove:
        all_blocks.pop(removing)

# Create blocks that fill holes between siblings.
def create_filler_blocks_for_holes(all_blocks, sequence):
    # Plug the holes: For each block that has children, make sure all the sequence is accounted for
    current_block_structures = [block for block in all_blocks.values()]
    # Go through all the blocks
    for block in current_block_structures:
        current_position = block["metadata"]["start"]
        i = 0
        # For each block go through all the children
        for i, child_id in enumerate(block["components"]):
            child = all_blocks[child_id]
            # If the child starts AFTER where it should start
            if child["metadata"]["start"] > current_position:
                # Create a filler block before the current block, encompassing the sequence between where the child should
                # start and where it actually starts. Add the filler block to the parent.
                block_id = str(uuid.uuid4())
                filler_block = create_block_json(block_id, sequence[current_position:child["metadata"]["start"]], [])
                filler_block["metadata"]["initialBases"] = filler_block["sequence"]["sequence"][:5]
                filler_block["metadata"]["color"] = None
                filler_block["metadata"]["start"] = current_position
                filler_block["metadata"]["end"] = child["metadata"]["start"] - 1
                filler_block["sequence"]["length"] = filler_block["metadata"]["end"] - filler_block["metadata"]["start"]
                all_blocks[block_id] = filler_block
                block["components"].insert(i, block_id)
            current_position = child["metadata"]["end"] + 1
        # If the last block doesn't end at the end of the parent, create a filler too!
        if i > 0 and current_position < block["metadata"]["end"]:
            block_id = str(uuid.uuid4())
            filler_block = create_block_json(block_id, sequence[current_position:block["metadata"]["end"] + 1], [])
            filler_block["metadata"]["initialBases"] = filler_block["sequence"]["sequence"][:5]
            filler_block["metadata"]["color"] = None
            filler_block["metadata"]["start"] = current_position
            filler_block["metadata"]["end"] = block["metadata"]["end"]
            filler_block["sequence"]["length"] = filler_block["metadata"]["end"] - filler_block["metadata"]["start"]
            all_blocks[block_id] = filler_block
            block["components"].insert(i + 1, block_id)

# If a block has children, remove its sequence
def remove_sequence_from_parents(all_blocks):
    for block in all_blocks.values():
        if len(block["components"]) > 0:
            block["sequence"]["sequence"] = ""
            block["sequence"]["length"] = 0

# Takes a BioPython SeqRecord and converts it to our blocks structures,
# with temporary ids
def convert_genbank_record_to_blocks(gb):
    all_blocks = {}
    sequence = str(gb.seq)

    root_block = create_root_block_from_genbank(gb, sequence)
    all_blocks[root_block["id"]] = root_block

    # Create a block for each feature
    for f in sorted(gb.features, key = lambda feat: len(feat)):
        create_child_block_from_feature(f, all_blocks, root_block, sequence)

    build_block_hierarchy(all_blocks, root_block, sequence)

    create_filler_blocks_for_holes(all_blocks, sequence)

    remove_sequence_from_parents(all_blocks)

    return { "root": all_blocks[root_block["id"]], "blocks": all_blocks }


# Given a file, create project and blocks structures to import into GD
def genbank_to_project(filename):
    project = { "components": []}
    blocks = {}
    generator = SeqIO.parse(open(filename,"r"),"genbank")
    for record in generator:
        results = convert_genbank_record_to_blocks(record)

        project["components"].append(results["root"]["id"])
        project["name"] = results["root"]["metadata"]["name"]
        project["description"] = results["root"]["metadata"]["description"]

        blocks.update(results["blocks"])
    return { "project": project, "blocks": blocks }
