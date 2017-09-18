FROM frolvlad/alpine-python3

#
# Setup
#

# Install OpenSSL and OpenSSH (For Git), Git, Nodejs (For Heroku CLI), Heroku CLI
RUN apk add --update openssh openssl git nodejs nodejs-npm
RUN npm install -g heroku-cli

# Clone Heroku Auto SSL
RUN git clone https://github.com/AdmitHub/heroku-auto-ssl.git /home/heroku-auto-ssl
WORKDIR /home/heroku-auto-ssl
RUN git checkout manual

# Setup Heroku Auto SSL
RUN git submodule init
RUN git submodule update
RUN pwd && ls -al
RUN hooks/setup-hooks.sh

#
# Run
# 
# Ensure the HEROKU_API_KEY environment variable is set or else we won't be able 
# to authenticate with Heroku to update certificates.
#
CMD ./dehydrated/dehydrated --register --accept-terms && \
    ./dehydrated/dehydrated --config /home/secrets/config
