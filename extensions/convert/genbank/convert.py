import requests
import json
from io import StringIO
from Bio import Seq
from Bio import SeqIO
from Bio import SeqFeature
import sys
import uuid
import sys
from genbank_import_export import *

to_genbank = sys.argv[1] == "to_genbank"

if to_genbank:
    genbank_file = sys.argv[3]
    project_file = sys.argv[2]
    project = json.load(open(project_file,"r"))
    project_to_genbank(genbank_file, project['project'], project['blocks'])
else:
    genbank_file = sys.argv[2]
    project_file = sys.argv[3]
    project = genbank_to_project(genbank_file, True)
    json.dump(project, open(project_file,'w'))
