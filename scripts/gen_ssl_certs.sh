#!/bin/bash
rootps=$1
shift
echo "$rootps" | sudo -S \
	letsencrypt certonly --agree-tos --manual --manual-public-ip-logging-ok $@
