#!/bin/sh

# install dependencies
if[[ -f "./run" ]]; then
        chnod +x run
        ./run install
fi