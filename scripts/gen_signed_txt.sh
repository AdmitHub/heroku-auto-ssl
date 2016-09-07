#!/bin/bash
echo "$1" | gpg --no-tty --armor --passphrase $2 --sign --default-key $3
