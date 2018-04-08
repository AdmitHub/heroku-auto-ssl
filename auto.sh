#!/usr/bin/env bash

# Backup old domains.txt
if [[ -f domains.txt ]]; then
    mv domains.txt domains.old.txt
fi

# Check for updates
cd update-if-needed && npm start && cd ../

# Run dehydrated if needed
if [ -f domains.txt ]; then
    ./dehydrated/dehydrated --register --accept-terms
	./dehydrated/dehydrated -c
else
    echo "No action needed"
fi

