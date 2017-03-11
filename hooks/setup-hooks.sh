#!/usr/bin/env bash
# Run from root of repository

# Check that cloudflare hook is cloned
if [[ ! -d "./hooks/cloudflare" ]]; then
    echo "Please clone down submodule ./hooks/cloudflare"
    exit 1
fi

# Install cloudflare hook pip requirements (Separate file for Python 3 vs 2)
if [[ "$(python --version)" =~ "3" ]]; then
    pip install --user -r "./hooks/cloudflare/requirements.txt"
else
    pip install --user -r "./hooks/cloudflare/requirements-python-2.txt"
fi
