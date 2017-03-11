# Instructions on how to update AdmitHub's SSL certificates
- 1. Initialize submodules
    - Run `git submodule init` to initialize submodules listed in `.gitmodules`
    - Run `git submodule update` to clone down submodule content
- 2. Link `hooks` directory to `dehydrated/hooks` dir
    - Run `make link-hooks` to link the `./hooks` directory to the `dehydrated/hooks` directory
    - This will add custom code to verify the `admithub.com` domain to Lets Encrypt and to deploy the provisioned SSL 
      certs when the time comes.
- 3. Create a copy of `config.example` named `config`
	- **!!Never Commit this value!!**
		- This key provides complete access to your CloudFlare account which includes DNS options
	- Change the value of `CF_KEY` (Last option in `config` file) to the value found in [Cloudflare Settings](https://www.cloudflare.com/a/account/my-account) > `Account` > `API Key` > `Global API Key`.
- 4. Go to the [Heroku Toolbelt installation documentation](https://devcenter.heroku.com/articles/heroku-cli#download-and-install) and follow the instructions for your operating system.
	- Login to the Heroku CLI with the `heroku login` command
- 5. Obtain the SSL certificates by running the following in the root of this repository: `make run`
	- Your newly obtained SSL certificates should be in the `certs/admithub.com` directory
	- This process can take anywhere from 1 to 20 minutes so be patient.
	- The reason behind this is that we are using DNS to verify our domains with Lets Encrypt. For this to work successfully we have
	to wait for DNS changes to propigate, how long this takes is basically random.
    - It typically takes around 5 to 15 minutes for the new SSL certificate to take effect.
		- Also beware when checking in browsers that some may cache certificates per session. So you may have to open new windows to see the new ssl certificates.
- 6. Once done delete the `certs` directory so you don't have all of AdmitHub's super secret SSL certificates laying around on your computer.
	- You can back them up but be sure to encrypt the backups in some form.

# Tools Used
## Dehydrated
**[Docs](https://dehydrated.de)**  
**Installation:** Clone down repo and run `dehydrated` executable.  

An application which interacts with the Lets Encrypt API to obtain SSL
certificates. Using instead of the standard Let's Encrypt client
because it supports convient hooks which can be used to automate part of the proccess.

## Heroku Toolbelt
**[Docs](https://devcenter.heroku.com/articles/heroku-cli)**  
**Installation:** Follow instructions in documentation.  

Provides control over Heroku applications from the command line.

## Python
Python `2.X.X` or `3.X.X` is required to run Dehydrated and its hooks.

# Files
Simple documentation for non obvouius files.

## config.example
**!!Do NOT commit with real `CF_KEY` value!!**  
Example `config` file which provides configuration values for Dehydrated.  

Should first be copied with the name `config` before the `CF_KEY` value
is edited.

## config
**!!Should NEVER be commited!!**  
Configuration file for Dehydrated. See `config.example` for more info.

## domains.txt
Configuration file which lets Dehydrated know which domains and subdomains to obtain SSL certificates for.

Each line represents a new domain. Entries are seperated by spaces.
The first entry is the root domain (Domain with no subdomains ex: `admithub.com`). Every entry after that is a subdomain containing the
root domain (ex. for subdomains `www` and `admin`: `www.admithub.com` `admin.admithub.com`).  

Another way of explaining it:
```
root1.tld sub1.root1.tld sub2.root1.tld sub3.root1.tld
root2.tld sub1.root2.tld sub2.root2.tld sub3.root2.tld
```
