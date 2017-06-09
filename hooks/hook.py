#!/usr/bin/env bash
# Simple script which allows chaining multiple hooks together
# Put hooks in the order you wish them to be called here:
#     Be sure to keep in mind the working directory this hook will run from
./hooks/cloudflare/hook.py "$@"
./hooks/heroku-auto-ssl/hook.py "$@"
