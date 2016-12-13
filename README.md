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
	- Change the value of `CF_KEY` (Last option in `config` file) to the value found in [Cloudflare Settings](https://www.cloudflare.com/a/account/my-account) > `Account` > `API Key` > `Global API Key`.
	- **!!Never Commit this value!!**
		- This key provides complete access to our CloudFlare account which includes DNS options
- 3.

# Tools Used
## Dehydrated
A application which interacts with the Lets Encrypt API to obtain SSL
certificates. Using instead of the standard Let's Encrypt because it
supports convient hooks which can be used to automate part of the proccess.

## Python
Python `2.X.X` or `3.X.X` is required to run Dehydrated and its hooks.

# Files
Simple documentation for non obvouius files.

## config.example
**!!Do NOT commit with non empty `CF_KEY` value!!**  
Example `config` file which provides configuration values for Dehydrated.  

Should first be copied with the name `config` before the `CF_KEY` value
is added.

## config
**!!Should NEVER be commited!!**  
Configuration file for Dehydrated. See `config.example` for more info.

## domains.txt
Configuration file which lets Dehydrated know which domains and subdomains to obtain SSL certificates for.

Each line represents a new domain. Entries are seperated by spaces.
The first entry is the root domain (Domain with no subdomains ex: admithub.com). Every entry after that is a subdomain (Including the
root domain ex: www.admithub.com admin.admithub.com).  

Another way of explaining it:
```
<root_domain> <sub_domain_1>.<root_domain> <sub_domain_2>.<root_domain>
```
