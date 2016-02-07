# Data API

TODOs

- test the /block/<blockId> interface
    - export functionality to get block projectId -- add to datastructure?
- move blocks under /block directory
- sequence
    - remove URL field from blocks
    - setting sequence returns updated block with md5

## Overview

This section of the API is for saving Projects and Blocks. Projects are saved as directories, and versioned under git. Blocks are directories under projects. Using the provided persistence interface, git versioning should be handled automatically. 

### Directory Structure 

/<projectId>
    manifest.json
    /<blockId>
        manifest.json
        sequence
    /<blockId>
        manifest.json
        sequence

## Files

### index.js

Express Router, largely relying on persistence interface

### versioning.js

git utilities, relying on nodegit

### persistence.js

Interface for checking existence / creating / replacing / merging / deleting projects and blocks

### filePaths.js

Create file system paths for projects, blocks, manifest files, sequence files