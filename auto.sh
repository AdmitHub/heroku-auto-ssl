#!/usr/bin/env bash

mv domains.txt domains.old.txt
cd update-if-needed && npm start && cd ../

if [ -f domains.txt ]; then
    ./dehydrated/dehydrated --register --accept-terms
	./dehydrated/dehydrated -c
else
    echo "No action needed"
fi

