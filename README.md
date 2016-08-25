# Heroku Auto SSL
An application that automates the creation and application of SSL certificates on Heroku.

# Setup
## Dependencies
You must have both the Heroku and Lets Encrypt (Certbot) command line 
interfaces installed.

## Configuration file
Make a copy of `sites.example.json` named `sites.json`. This file specifies which Heroku apps to configure and which
domain names to retrieve SSL certificates for.

**Keys**:
- `heroku_app`
    - Name of the Heroku app to configure
- `cert_url`
    - Url to retrieve SSL certificate for
- `verif_priv_key_path`
    - Path to private key file which will be used to sign verification setup requests

# Notes
The following runs `certonly` in manual mode without needing interactive prompts.  

```
sudo letsencrypt certonly --dry-run --email noahhuppert@gmail.com --domain www.noahhuppert.com --agree-tos --manual --manual-public-ip-logging-ok
```
