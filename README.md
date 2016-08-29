# Heroku Auto SSL
Tool which automates the process of obtaining and provisioning SSL certificates for Heroku applications.

## Obtaining SSL certificates
Heroku Auto SSL uses [Lets Encrypt](https://letsencrypt.org/) to obtain free trusted SSL certificates.

# Setup
## Installation
To use Heroku Auto SSL the Heroku and Lets Encrypt command line interfaces must be present in the path.

- [Install Heroku CLI](https://devcenter.heroku.com/articles/heroku-command-line)
- [Install Lets Encrypt CLI](https://certbot.eff.org)

## Configuration
Make a copy of `sites.example.json` named `sites.json`.
The `sites.json` provides all the information required to obtain and provision SSL certificates for the sites provided.

**`sites.json` keys**:
- `heroku_app`
    - Name of the Heroku app
- `cert_url`
    - URL to obtain SSL certificate for
    - Also assumed to be the application's URL
- `chlng_post_proto`
    - Configuration related to the Challenge Post protocol
- `chlng_post_proto.priv_key`
    - GnuPG recognizable id of key pair used to sign Challenge Post protocol requests
        - If the key you wish to use is the only private key GnuPG is aware of you can provide the corresponding email address
	- If GnuPG is aware of more than one private key please provide the id of the key
	    - Can be found in the second part (Parts seperated by a `/`) of the second column of `gpg --list-keys`
- `chlng_post_proto.root_url`
    - Path on server to the root of the Challenge Post protocol
    - Should only be an absolute path, domain name not required (ex., `/ssl/challenge_post`)
    - Heroku Auto SSL tool should be able to access the `/check` and `/post` endpoints when this fields value is
    combined with `cert_url`. (Combined in the form of: `${cert_url}${chlng_post_proto.root_url}`)

# Server Setup
In order to securely receive Challenge Post protocol requests servers must have knowledge of the corresponding public
key. Set the `CHLNG_POST_PROTO_PUB_KEY` environment variable to the contents of the public key.

# Behind the scenes
Heroku Auto SSL does not interact with any secret APIs, instead it uses the Heroku and Lets Encrypt command line
clients on behalf of the user.

# Challenge Post protocol
(Abbreviated as: "CPP")
The Challenge Post protocol is used to dynamically post a Lets Encrypt `http-01` challenges to Heroku application
servers.

## Security
To avoid unauthorized requests the Challenge Post protocol uses GPG public private key encryption. Every request made to
any CPP endpoint must have a body signed with a private key. Every server which receives CPP requests must have the
corresponding public key, and checks the body of each request to see if it was signed correctly.

As a further security measure any CPP requests which are not signed correctly will return with the status code `404`.

## Endpoints
Message bodies should be encoded in `application/x-www-form-urlencoded` form.

- `${chlng_post_proto.root_url}/check`
    - **Method:** `POST`
    - **Body**
        - Must be exactly: `OK?`
    - **Response**
        - `200` - **Body:** `OK`
            - If message is signed with correct private key
- `${chlng_post_proto.root_url}/post`
    - **Method:** `POST`
    - **Body**
        - Encoded in `application/x-www-form-urlencoded` form
        - Contains keys:
            - `url`
                - URL which Lets Encrypt `http-01` challenge should be hosted
            - `content`
                - Content to host at provided URL
    - **Response**
        - `200` - **Body:** `OK`
            - If challenge is successfully posted

# Notes
The following runs `certonly` in manual mode without needing interactive prompts.  

```
sudo letsencrypt certonly --dry-run --email noahhuppert@gmail.com --domain www.noahhuppert.com --agree-tos --manual --manual-public-ip-logging-ok
```
