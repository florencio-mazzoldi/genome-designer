import json
from Bio import Seq
from Bio import SeqIO
from Bio import SeqFeature
import uuid

sbol_type_table = {
    "CDS": "cds",
    "regulatory": "promoter", #promoter is actually a subclass of regulatory
    "promoter": "promoter",
    "terminator": "terminator",
    "gene": "cds",
    "mat_peptide": "cds"
}

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

# Determines the kind of relationship between 2 blocks, using only the start and end positions
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
def convert_block_to_feature(all_blocks, to_convert, parent, to_remove_list):
    feature = { }
    for key, value in to_convert["metadata"].iteritems():
        if key in ["name", "description", "start", "end", "tags"]:
            feature[key] = value
        elif key == "strand":
            feature["isForward"] = (value == 1)
        else:
            if "notes" not in feature:
                feature["notes"] = {}
            feature["notes"]["key"] = value

    feature["sequence"] = to_convert["sequence"]["sequence"]

    if "annotations" not in parent["sequence"]:
        parent["sequence"]["annotations"] = []

    parent["sequence"]["annotations"].append(feature)
    to_remove_list.append(to_convert)

    # And also convert to features all the components of the removed block, recursively
    for to_convert_child_id in to_convert["components"]:
        to_convert_child = all_blocks[to_convert_child_id]
        convert_block_to_feature(all_blocks, to_convert_child, parent, to_remove_list)

def create_root_block_from_genbank(gb, sequence):
    full_length = len(sequence)

    root_id = str(uuid.uuid4())
    root_block = create_block_json(root_id, sequence, [])
    root_block["metadata"]["description"] = gb.description
    root_block["metadata"]["name"] = gb.name
    root_block["metadata"]["start"] = 0
    root_block["metadata"]["end"] = full_length - 1
    root_block["metadata"]["genbank"]["original_id"] = gb.id
    root_block["sequence"]["length"] = full_length
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

def create_child_block_from_feature(f, all_blocks, root_block, sequence):
    qualifiers = f.qualifiers
    start = f.location.start.position
    end = f.location.end.position
    strand = f.location.strand
    sbol_type = sbol_type_table.get(f.type)

    if f.type == 'source':
        for key, value in qualifiers.iteritems():
            if "feature_annotations" not in root_block["metadata"]["genbank"]:
                root_block["metadata"]["genbank"]["feature_annotations"] = {}
            root_block["metadata"]["genbank"]["feature_annotations"][key] = value[0]
    else:
        block_id = str(uuid.uuid4())
        child_block = create_block_json(block_id, sequence[start:end], [])
        for q in f.qualifiers:
            if q == "name":
                child_block["name"] = f.qualifiers[q][0]
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

        if sbol_type:
            child_block["rules"]["sbol"] = sbol_type

        child_block["metadata"]["type"] = f.type

        if "name" not in child_block:
            if "label" in f.qualifiers:
                child_block["metadata"]["name"] = f.qualifiers["label"][0]
            elif sbol_type == 'cds' and "gene" in f.qualifiers:
                child_block["metadata"]["name"] = f.qualifiers["gene"][0]
            elif "product" in f.qualifiers:
                child_block["metadata"]["name"] = f.qualifiers["product"][0]
            else:
                if sbol_type:
                    child_block["metadata"]["name"] = sbol_type
                elif f.type:
                    child_block["metadata"]["name"] = f.type

        if "GD_description" in f.qualifiers:
            child_block["metadata"]["description"] = f.qualifiers["GD_description"][0]

        all_blocks[block_id] = child_block

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
        if block == root_block:
            continue

        inserted = False

        parents = []
        for j in range(i + 1, blocks_count):
            # If it is a child of root, don't add it as child of any other block with the same size
            if sorted_blocks[j]["sequence"]["length"] == root_block["sequence"]["length"] and sorted_blocks[
                j] != root_block:
                continue

            if sorted_blocks[j]["metadata"]["end"] >= block["metadata"]["end"] and sorted_blocks[j]["metadata"]["start"] <= \
                    block["metadata"]["start"]:
                parents.append(sorted_blocks[j])

        for other_block in parents:
            rel = relationship(block, other_block, full_length)
            if rel == "child":
                i = 0
                is_partial_overlap = False
                for sib_id in other_block["components"]:
                    sibling = all_blocks[sib_id]
                    relationship_to_sibling = relationship(block, sibling, full_length)
                    if relationship_to_sibling == "after":
                        i += 1
                    elif relationship_to_sibling != "before":  # Partial match! Just an annotation of the parent
                        is_partial_overlap = True
                        break
                if not is_partial_overlap:
                    other_block["components"].insert(i, block["id"])
                else:
                    convert_block_to_feature(all_blocks, block, other_block, to_remove)
                inserted = True
                break
            elif rel == "equal":
                convert_block_to_feature(all_blocks, block, other_block, to_remove)
                inserted = True
                break

        if not inserted:  # This should never happen because the block should be at least child of root!
            if block["sequence"]["length"] == root_block["sequence"]["length"]:
                convert_block_to_feature(all_blocks, block, root_block, to_remove)
            else:
                raise Exception('Error processing a block!')

    for removing in to_remove:
        all_blocks.pop(removing["id"])

def create_filler_blocks_for_holes(all_blocks, sequence):
    # Plug the holes: For each block that has children, make sure all the sequence is accounted for
    current_block_structures = [block for block in all_blocks.values()]
    for block in current_block_structures:
        current_position = block["metadata"]["start"]
        i = 0
        for i, child_id in enumerate(block["components"]):
            child = all_blocks[child_id]
            if child["metadata"]["start"] > current_position:
                block_id = str(uuid.uuid4())
                filler_block = create_block_json(block_id, sequence[current_position:child["metadata"]["start"]], [])
                filler_block["metadata"]["type"] = "filler"
                filler_block["metadata"]["name"] = filler_block["sequence"]["sequence"][:3] + '...'
                filler_block["metadata"]["start"] = current_position
                filler_block["metadata"]["end"] = child["metadata"]["start"] - 1
                filler_block["sequence"]["length"] = filler_block["metadata"]["end"] - filler_block["metadata"]["start"]
                all_blocks[block_id] = filler_block
                block["components"].insert(i, block_id)
            current_position = child["metadata"]["end"] + 1
        if i > 0 and current_position < block["metadata"]["end"]:
            block_id = str(uuid.uuid4())
            filler_block = create_block_json(block_id, sequence[current_position:block["metadata"]["end"] + 1], [])
            filler_block["metadata"]["type"] = "filler"
            filler_block["metadata"]["name"] = filler_block["sequence"]["sequence"][:3] + '...'
            filler_block["metadata"]["start"] = current_position
            filler_block["metadata"]["end"] = block["metadata"]["end"]
            filler_block["sequence"]["length"] = filler_block["metadata"]["end"] - filler_block["metadata"]["start"]
            all_blocks[block_id] = filler_block
            block["components"].insert(i + 1, block_id)


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

    return { "root": all_blocks[root_block["id"]], "blocks": all_blocks }


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
