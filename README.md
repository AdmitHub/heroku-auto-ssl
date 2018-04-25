# Instructions on how to update AdmitHub's SSL certificates
- Clone down this repository
- Initialize submodules
    - Run `git submodule init` to initialize submodules listed in `.gitmodules`
    - Run `git submodule update` to clone down submodule content
- Setup project dependencies by running `make setup-hooks`
- Create a copy of `config.example` named `config`
	- Change the value of `CF_KEY` (Last option in `config` file) to the value found in [Cloudflare Settings](https://www.cloudflare.com/a/account/my-account) > `Account` > `API Key` > `Global API Key`.
    	- **!!Never Commit this value!!**
		- This key provides complete access to your CloudFlare account which includes DNS options
- Go to the [Heroku Toolbelt installation documentation](https://devcenter.heroku.com/articles/heroku-cli#download-and-install) and follow the instructions for your operating system.
	- Login to the Heroku CLI with the `heroku login` command
- Obtain the SSL certificates by running the following in the root of this repository: `./auto.sh`
	- Your newly obtained SSL certificates should be in the `certs/admithub.com` directory
	- This process can take anywhere from 1 to 20 minutes so be patient.
	- The reason behind this is that we are using DNS to verify our domains with Lets Encrypt. For this to work successfully we have
	to wait for DNS changes to propagate, how long this takes is basically random.
    - It typically takes around 5 to 15 minutes for the new SSL certificate to take effect.
		- Also beware when checking in browsers that some may cache certificates per session. So you may have to open new windows to see the new ssl certificates.
- Once done delete the `certs` directory so you don't have all of AdmitHub's super secret SSL certificates laying around on your computer.
	- You can back them up but be sure to encrypt the backups in some form.
	
# Systems documentation
This section provides an overview of the Heroku Auto SSL "tool". 
The Heroku Auto SSL tool code is actually just a couple hooks for a Lets Encrypt command line tool called Dehydrated 
(See Tools Used#Dehydrated). 

Dehydrated performs all interaction with the Lets Encrypt servers. It allows others (like us) to run some code during 
specific parts of the certificate gathering process. These custom bits of code are called hooks.

The `config` file in this repository instructs Dehydrated to obtain a SSL certificate from Lets Encrypt using the 
`dns-01` verification method. Basically Let's Encrypt needs to verify that the person they are giving SSL certificates 
to actually owns the domain. One way they do this is by asking the certificate requester to add some `TXT` records with 
specific text to their domain DNS. If the values of the `TXT` records posted match the ones Let's Encrypt asked for then 
they assume you own the domain. 

Heroku Auto SSL uses a Dehydrated hook called `kappataumu/letsencrypt-cloudflare-hook` to automatically post the requested 
`TXT` records up to the Admithub.com Cloudflare DNS. You must set the `CF_KEY` value in the file `config` for this hook 
to work. 

Once the Dehydrated tool has successfully obtained the SSL certificates it will call `./hooks/heroku-auto-ssl/hook.py`. 
This custom hook for Dehydrated takes the obtained SSL certificate and deploys it to the specified Heroku SSL endpoints. 
These endpoints can be set in the `HEROKU_APP_IDS` key of the `config` file. 

## Detailed `./hooks/heroku-auto-ssl/hook.py` overview
This section provides a more detailed overview of the specific Heroku Auto SSL hook. Consider reading this section if 
you will be editing `./hooks/heroku-auto-ssl/hook.py`.

When `hook.py` gets called by Dehydrated, several command line arguments are supplied. The first command line argument 
(after the file name) is the name of the hook to run. This specifies which stage of the SSL certificate retrieval process 
Dehydrated is in. For this specific hook we only care about the `deploy_cert` hook. Any command line arguments after the 
hook name are hook specific (Specific paths to SSL certificates, domains names, ect...). 

When `hook.py` gets run it calls the `main()` function. In this function there is an `operations` object. This is 
where the program "registers" hooks it will handle. Keys in the `operations` object are hook names, values are handler 
functions. Later on in `main()` the program checks to see if a key with the hook name given as a command line argument 
exists in the `operations` object. If so the corresponding handler function gets run. 

Since the `deploy_cert` hook is the only one we handle right now, `deploy_cert()` is the only handler function to go over. 
`deploy_cert()` gets called to, unsurprisingly, handle the `deploy_cert` hook. This function will deploy the retrieved 
SSL certificate to every Heroku app specified in the `HEROKU_APP_IDS` configuration value. It gets called with the 
argument `args`. Every handler function will be passed `args`. It is an array of all command line arguments provided after 
the hook name. `args` is then expanded out into multiple hook specific variables.

After `deploy_cert()` has expanded `args` out into multiple hook specific variables (domain, key files, cert file, 
full chain file, chain file, and timestamp) the program attempts to load Heroku App Ids from the environment variable 
`HEROKU_APP_IDS` (Which is set in the `config` file). This is done via the `get_heroku_app_ids()` function. This 
function lazy loads a JSON array from the environment variable `HEROKU_APP_IDS`. Next the program runs:
```bash
heroku certs:update <cert file> <key file> --app <heroku app id> --confirm <heroku app id>
```

for every Heroku App Id. 

## Make commands
This section provide documentation on the Make commands used in this project.
- `setup-hooks` - Will install Python dependencies for the Cloudflare Dehydrated hook
    - This runs the `./hooks/setup-hooks.sh` script
    - This script detects which python version is installed and installs the appropriate dependencies

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
Simple documentation for non obvious files.

## config.example
**!!Do NOT commit with real `CF_KEY` value!!**  
Example `config` file which provides configuration values for Dehydrated.  

Should first be copied with the name `config` before the `CF_KEY` value
is edited.

`HEROKU_APP_IDS` contains a list of Heroku App ids to update when an SSL certificate is successfully obtained.

## config
**!!Should NEVER be commited!!**  
Configuration file for Dehydrated. See `config.example` for more info.

## domains.master.txt
Configuration file which lets Dehydrated know which domains and subdomains to obtain SSL certificates for.

Each line represents a new domain. Entries are seperated by spaces.
The first entry is the root domain (Domain with no subdomains ex: `admithub.com`). Every entry after that is a subdomain containing the
root domain (ex. for subdomains `www` and `admin`: `www.admithub.com` `admin.admithub.com`).  

Another way of explaining it:
```
root1.tld sub1.root1.tld sub2.root1.tld sub3.root1.tld
root2.tld sub1.root2.tld sub2.root2.tld sub3.root2.tld
```

## auto.sh
Automatically determines which domains need to be updated and runs Dehydrated to update certs for those domains.
