# Instructions on how to update AdmitHub's SSL certificates
- 1. Clone down a tool for Lets Encrypt called Dehydrated: `git clone https://github.com/lukas2511/dehydrated`
	- 1.1. Clone down a plugin for Dehydrated
		- `cd dehydrated`
		- `mkdir hooks`
		- `git clone https://github.com/kappataumu/letsencrypt-cloudflare-hook hooks/cloudflare`
	- 1.2. Check which version of Python you are running (With `python --version`)
		- 1.2.1. If Python `2.X.X`
			- `pip install -r hooks/cloudflare/requirements-python-2.txt`
		- 1.2.2. If Python `3.X.X`
			- `pip install -r hooks/cloudflare/requirements.txt`
- 2. Create a copy of `config.example` named `config`
	- **!!Never Commit this value!!**
		- This key provides complete access to your CloudFlare account which includes DNS options
	- Change the value of `CF_KEY` (Last option in `config` file) to the value found in [Cloudflare Settings](https://www.cloudflare.com/a/account/my-account) > `Account` > `API Key` > `Global API Key`.
- 3. Obtain the SSL certificates by running the following in the root of this repository: `./dehydrated/dehydrated -c`

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
The first entry is the root domain (Domain with no subdomains ex: `admithub.com`). Every entry after that is a subdomain (Including the
root domain ex: `www.admithub.com` `admin.admithub.com`).  

Another way of explaining it:
```
root.tld sub1.root.tld sub2.root.tld sub3.root.tld
```
