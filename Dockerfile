FROM jfloff/alpine-python:latest

#
# Setup
#

# Install CA certs, Bash, OpenSSL and OpenSSH (For Git), Git, Nodejs (For Heroku CLI), Heroku CLI
RUN apk add --update ca-certificates openssh openssl git nodejs nodejs-npm
RUN npm install -g heroku-cli

# Clone Heroku Auto SSL
RUN git clone https://github.com/AdmitHub/heroku-auto-ssl.git /home/heroku-auto-ssl
WORKDIR /home/heroku-auto-ssl
RUN git checkout manual

# Setup Heroku Auto SSL
RUN git submodule init
RUN git submodule update
RUN hooks/setup-hooks.sh

# Setup update if needed
RUN cd update-if-needed && npm install

#
# Run
# 
# Ensure the HEROKU_API_KEY environment variable is set or else we won't be able 
# to authenticate with Heroku to update certificates.
#
CMD ./auto.sh
