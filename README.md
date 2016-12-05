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

