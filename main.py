import subprocess, sys, shutil, json, re, argparse, os, urllib
from urllib.request import Request, urlopen

try:
    import getpass
except getpass.GetPassWarning:
    print("Pl")

# Simple logging helpers
TAG_ERR    = "[ERROR ] "
TAG_INFO   = "[INFO  ] "
TAG_PROMPT = "[PROMPT] "

COLOR_ERR = '\033[91m'
COLOR_PROMPT = '\033[92m'
COLOR_INFO = '\033[95m'
_COLOR_END = '\033[0m'

LOG_INDENT = "    "

def log(tag, color, msg, indent="", indent_num=0):
    print(color + tag + (indent * indent_num) + msg + _COLOR_END)

def log_err(msg):
    log(TAG_ERR, COLOR_ERR, msg)

def logi_err(msg, indent=LOG_INDENT, indent_num=1):
    log(TAG_ERR, COLOR_ERR, msg, indent, indent_num)

def log_info(msg):
    log(TAG_INFO, COLOR_INFO, msg)

def logi_info(msg, indent=LOG_INDENT, indent_num=1):
    log(TAG_INFO, COLOR_INFO, msg, indent, indent_num)

def log_prompt(msg):
    log(TAG_PROMPT, COLOR_PROMPT, msg)

def logi_prompt(msg, indent=LOG_INDENT, indent_num=1):
    log(TAG_PROMPT, COLOR_PROMPT, msg, indent, indent_num)

def prompt(question):
    prompt = COLOR_PROMPT + TAG_PROMPT + question + " " + _COLOR_END

    return input(prompt)

def prompt_choices(question, choices=["y", "n"], default_i=0):
    choices_str = ""

    choices_i = 0
    for choice in choices:
        if choices_i != 0:
           choices_str += "/"

        if choices_i == default_i:
            choices_str += choice.upper()
        else:
            choices_str += choice.lower()

        choices_i += 1

    while True:
        inp = prompt(question + " [" + choices_str + "]")

        if inp == "":
            return default_i

        if inp in choices:
            return choices.index(inp)

# Subprocess helpers
def decode_output(pipe):
    return pipe.decode(sys.stdout.encoding)

# GPG helpers
signed_messages = {};

def prompt_key_password(key_id):
    signed_messages[key_id]['password'] = prompt("Please enter the password for key " + key_id + " (Not stored)")

def gen_signed_txt(txt, key_id, password_reprompts=1):
    if key_id not in signed_messages:
        signed_messages[key_id] = {}
        signed_messages[key_id]['signed_text'] = {}

        prompt_key_password(key_id)

    if txt not in signed_messages[key_id]['signed_text']:
        sign = subprocess.run(["./gen_signed_txt.sh", "OK?", signed_messages[key_id]['password'], key_id], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if sign.returncode == 0:
            out = decode_output(sign.stdout)
            signed_messages[key_id]['signed_text'][txt] = out
            return out
        elif sign.returncode == 2:
            if password_reprompts < 5:
                log_err("Password for " + key_id + " is incorrect, reprompting")
                prompt_key_password(key_id)
                gen_signed_txt(txt, key_id, password_reprompts + 1)
            else:
                log_err("Password for key " + key_id + " entered incorrectely 5 times")
                log_err("Exiting...")
                sys.exit()
        else:
            log_err("An unknown error has occured while generated GPG signed text:")
            logi_err(decode_output(sign.stderr))
            log_err("Exiting...")
            sys.exit()
    else:
        return signed_messages[key_id]['signed_text'][txt]

# HTTP helpers
def make_post(url, body):
    request = Request(url, data=body.encode(), headers={'Content-Type': 'text/plain'})
    try:
        return urlopen(request).read().decode()
    except urllib.error.HTTPError as error:
        return error.read().decode()

# Notify if dry run
if args.dry_run:
    log_info("Dry run enabled")

# Check for dependencies
heroku_cli_path = shutil.which("heroku")
certbot_cli_path = shutil.which("letsencrypt")

deps_met = True
if heroku_cli_path == None:
    log_err("Cannot find the Heroku CLI in path")
    deps_met = False

if certbot_cli_path == None:
    log_err("Cannot find the Lets Encrypt CLI (Certbot) in path")
    deps_met = False

if deps_met == False:
    log_err("Not all dependencies met, exiting...")
    sys.exit(1)

# Parse command line arguments
parser = argparse.ArgumentParser(description="Tool which automates the process of obtaining and provisioning SSL certificates for Heroku applications.")
parser.add_argument("--skip-preflight-checks",
                    dest="skip_preflight",
                    action="store_const",
                    const=True,
                    default=False)
parser.add_argument("--domains-ok",
                    dest="domains_ok",
                    action="store_const",
                    const=True,
                    default=False)
parser.add_argument("--email",
                    required=True)
parser.add_argument("--dry-run",
                    dest="dry_run",
                    action="store_const",
                    const=True,
                    default=False)

args = parser.parse_args()

# Check Heroku logged in
if args.skip_preflight == False:
    log_info("Checking Heroku account")

    heroku_whoami = subprocess.run(["heroku", "whoami"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if heroku_whoami.returncode == 0:
        logi_info("Logged in as " + decode_output(heroku_whoami.stdout).rstrip())
    elif heroku_whoami.returncode == 100:
        logi_err("Not logged in")
        logi_err("Exiting...")
        sys.exit(1)
    else:
        logi_err("Unknown error when running:")
        logi_err("$ heroku whoami", indent_num=2)
        logi_err(decode_output(heroku_whoami.stdout), (LOG_INDENT * 2) + "  ")
        logi_err("Exiting...")
        sys.exit(1)

# Load sites.csv
log_info("Loading \"sites.json\"")
sites_conf = []
with open("sites.json") as sites_conf_file:
    sites_conf = json.load(sites_conf_file)

for site in sites_conf:
    logi_info("Found " + site['heroku_app'] + " (" + site['cert_url'] + ")")

# Check Heroku app access
if args.skip_preflight == False:
    log_info("Checking Heroku app access")
    can_access_apps = True

    for site in sites_conf:
        app_ps = subprocess.run(["heroku", "domains", "--app", site['heroku_app']], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # Store domain check result for future
        if app_ps.returncode == 0 or app_ps.returncode == 1:
            if site['cert_url'] in decode_output(app_ps.stdout):
               site['heroku_has_domain'] = True
            else:
                site['heroku_has_domain'] = False

        if app_ps.returncode == 0:
            logi_info(site['heroku_app'] + " OK!")
        elif app_ps.returncode == 1:
            logi_err(site['heroku_app'] + " NOT OK!")
            logi_err("Cannot access " + site['heroku_app'], indent_num=2)

            can_access_apps = False
        else:
            logi_err(site['heroku_app'] + " NOT OK!")
            logi_err("Unknown error when running:", indent_num=2)
            logi_err("$ heroku domains --app " + site['heroku_app'], indent_num=2)
            logi_err(decode_output(app_ps.stdout), (LOG_INDENT * 2) + "  ")
            logi_err("Exiting...", indent_num=2)
            sys.exit(1)

    if can_access_apps == False:
        log_err("Cannot access all apps")
        log_err("Exiting...")
        sys.exit(1)

# Check Heroku domains for apps
if args.skip_preflight == False:
    log_info("Checking Heroku app domains match with provided")
    heroku_apps_have_domains = True

    for site in sites_conf:
        if site['heroku_has_domain'] == True:
           logi_info(site['heroku_app'] + " (" + site['cert_url'] + ") OK!")
        else:
            logi_err(site['heroku_app'] + " (" + site['cert_url'] + ") NOT OK!")
            logi_err("Application does not have the domain: \"" + site['cert_url'] + "\"", indent_num=2)
            heroku_apps_have_domains = False

    if heroku_apps_have_domains == False:
        log_err("Not all Heroku apps have the domain provided")
        logi_err("Make sure to register the provided domains with Heroku before continuing")
        log_err("Exiting...")
        sys.exit(1)

    # Check Heroku for SSL endpoints
    log_info("Checking for SSL endpoints")
    heroku_apps_have_endpoints = True
    endpoint_check_exp = re.compile("ssl \(.*\)[ ]+endpoint")

    for site in sites_conf:
        app_addons = subprocess.run(["heroku", "addons", "--app", site['heroku_app']], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if app_addons.returncode == 0:
            output = decode_output(app_addons.stdout)
            matches = endpoint_check_exp.search(output)

            if matches != None:
                logi_info(site['heroku_app'] + " OK!")
            else:
                logi_err(site['heroku_app'] + " NOT OK!")
                logi_err("Could not find SSL endpoint in addons", indent_num=2)

                heroku_apps_have_endpoints = False
        else:
            logi_err("Unknown error when running:")
            logi_err("$ heroku addons --app " + site['heroku_app'], indent_num=2)
            logi_err(decode_output(app_addons.stderr), (LOG_INDENT * 2) + "  ")
            logi_err("Exiting...")
            sys.exit(1)

    if heroku_apps_have_endpoints == False:
        log_err("Not all Heroku apps have SSL endpoints")
        logi_err("Make sure to add the SSL endpoint addon before continuing")
        log_err("Exiting...")
        sys.exit(1)

# Determine Heroku SSL endpoint action
log_info("Determining SSL endpoint action")

for site in sites_conf:
    cert_info = subprocess.run(["heroku", "certs:info", "--app", site['heroku_app']], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if cert_info.returncode == 0:
        logi_info(site['heroku_app'] + " UPDATE!")
        site['endpoint_action'] = 'update'
    else:
        output = decode_output(cert_info.stderr)

        if "has no SSL Endpoints." in output:
            logi_info(site['heroku_app'] + " CREATE!")
            site['endpoint_action'] = 'create'
        else:
            logi_err("Unknown error when running:")
            logi_err("$ heroku certs:info --app " + site['heroku_app'], indent_num=2)
            logi_err(output, (LOG_INDENT * 2) + "  ")
            logi_err("Exiting...")
            sys.exit(1)

# Generate SSL cert domain list
domains = []

for site in sites_conf:
    domains.append(site['cert_url'])

# Validate SSL cert domain list
log_info("Will attempt to generate an SSL certificate for the following domains:")

for domain in domains:
    logi_info("- " + domain)

if args.domains_ok == False:
    ok_prompt_res = prompt_choices("Is this ok?")

    if ok_prompt_res == 1:
        log_err("SSL certificate domains not ok")
        logi_err("Modify your configuration and rerun")
        log_err("Exiting...")
        sys.exit(1)

# Check that servers are Challenge Post protocol compliant
log_info("Checking domains for Challenge Post protocol compliance");

all_domains_have_cpp = True

# -- First generate a Map<String(key id), Map<String(plaintext), String(signed text)>> for keys
for site in sites_conf:
    key_id = site['challenge_proto']['priv_key']
    if key_id not in signed_messages:
        signed_messages[key_id] = {};
        signed_messages[key_id]['signed_text'] = {}

        prompt_key_password(key_id)


for key in signed_messages:
   gen_signed_txt("OK?", key)

for site in sites_conf:
    url = "http://" + site['cert_url'] + site['challenge_proto']['root_url'] + "/check"
    key_id = site['challenge_proto']['priv_key']

    res = make_post(url, signed_messages[key_id]['signed_text']["OK?"])

    if res == "OK":
        logi_info(site['heroku_app'] + " OK!")
    else:
        logi_err(site['heroku_app'] + " NOT OK!")
        all_domains_have_cpp = False

if all_domains_have_cpp == False:
    log_err("Not all domains have Challenge Post protocol support")
    log_err("Exiting...")
    sys.exit()

# Request certs from Lets Encrypt
domains_arg_list = []

for domain in domains:
    domains_arg_list.push("--domain " + domain)

get_certs_dry_run_param = ""

if args.dry_run == True:
    get_certs_dry_run_param = "--dry-run"

get_certs = subprocess.run(["letsencrypt", "certsonly", get_certs_dry_run_param, "--email", args.email])
