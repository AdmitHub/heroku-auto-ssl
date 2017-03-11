#1/usr/bin/env python
import sys, logging, getpass, subprocess, os, json

# map of domains and their Heroku apps
_heroku_domain_mapping = None
"""Get Heroku app Id for provided domain
This in../hooks hooksformation is gotten from HEROKU_AUTO_SSL_DOMAIN_MAPPING
environment variable. This environment variable should be a JSON kv map.
Keys should be the domain. Values should be the Heroku app Ids.

"Lazy Parses" JSON from environment variable.

Args:
    - domain (str): Domain to get Heroku app Id for

Returns:
    - str: Heroku App Id for provided domain

Raises:
    - ValueError: If HEROKU_AUTO_SSL_DOMAIN_MAPPING environment variable is not set
    - SyntaxError: If contents of HEROKU_AUTO_SSL_DOMAIN_MAPPING environment variable fail to be parsed to json
    - KeyError: If Heroku App id is not specified for given domain
"""
def get_heroku_app_id_for_domain(domain):
    global _heroku_domain_mapping
    # Lazy load
    if _heroku_domain_mapping is None:
        env = os.environ.get("HEROKU_AUTO_SSL_DOMAIN_MAPPING")

        # Check if environment variable is set
        if env is None:
            err_txt = "HEROKU_AUTO_SSL_DOMAIN_MAPPING not set"
            logging.exception(err_txt)
            raise ValueError(err_txt)

        # Parse HEROKU_AUTO_SSL_DOMAIN_MAPPING to json
        try:
            _heroku_domain_mapping = json.loads(env)
        except json.JSONDecodeError as e:
            err_txt = "Error parsing HEROKU_AUTO_SSL_DOMAIN_MAPPING environment variable to json"
            logging.exception(err_txt)
            raise SyntaxError(err_txt)

    # Check if domain is given in mapping
    if domain not in _heroku_domain_mapping:
        err_txt = "Not Heroku App Id given for domain: \"{}\"".format(domain)
        logging.exception(err_txt)
        raise KeyError(err_txt)

    return _heroku_domain_mapping[domain]



# str to log with identifying info
_identifying_info = None
"""Get identifying information of computer user in loggable str
This includes:
    - Computer user name
    - Git user name
    - Git user email

Note: This doesn't actually get identifiable information in a computer forensics way.
More of a "Who at the company did what last" way (At best: Who broke what).

Returns:
    - str: Identifying information for computer user in format: user.username="{}", git.user.name="{}", git.user.email="{}"
"""
def get_identifying_info():
    global _identifying_info
    # Lazy load
    if _identifying_info is None:
        # Get user's name
        username = None
        try:
            username = getpass.getuser()
        except:
            logging.exception("Error while trying to get user's username")

        # Get Git information
        git_user = None
        git_email = None
        if which("git") is not None:
            try:
                git_user = cmd_output(["git", "config", "user.name"])
            except Exception as e:
                logging.exception("Error while trying to find user's git.user.name")

            try:
                git_email = cmd_output(["git", "config", "user.email"])
            except Exception as e:
                logging.exception("Error while trying to find user's git.user.email")

        _identifying_info = "user.username=\"{}\", git.user.name=\"{}\", git.user.email=\"{}\"".format(username, git_user, git_email)

    return _identifying_info

"""Command which emulates `which` UNIX command
Credit to users Jay(https://stackoverflow.com/users/20840/jay) and harmv(https://stackoverflow.com/users/328384/harmv)
on SO for the code: http://stackoverflow.com/a/377028/1478191

Returns the full path to a program accessable from the PATH.

Args:
    - program (str): Name of program

Returns:
    - str: Full path to excitable file
    - None: If executable is not found anywhere
"""
def which(program):
    import os
    def is_exe(fpath):
        return os.path.isfile(fpath) and os.access(fpath, os.X_OK)

    fpath, fname = os.path.split(program)
    if fpath:
        if is_exe(program):
            return program
    else:
        for path in os.environ["PATH"].split(os.pathsep):
            path = path.strip('"')
            exe_file = os.path.join(path, program)
            if is_exe(exe_file):
                return exe_file

    return None

def clean_cmd_output (output):
    if output is not None:
        output = output.decode("utf-8").rstrip()

    return output

"""Returns the output of the given command
Args:
    - cmds (str[]): Array of commands parts

Returns:
    - str: Command output
    - None: If no command output was received
"""
def cmd_output(cmds):
    proc = subprocess.Popen(cmds, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.PIPE)
    output, err = proc.communicate()

    # Trimp output if exists
    output = clean_cmd_output(output)
    err = clean_cmd_output(err)

    # Raises Exception if stderr output exists
    if (err is not None) and (len(err) > 0):
        raise Exception("Error while running command: \"{}\"".format(err))

    return output


###################
#      HOOKS      #
###################
"""Dehydrated 'deploy_cert' hook handler
Purpose is to deploy successfully gained SSL certs to application

Args:
    - args (object[]): Command lind arguments without filename or hook name. Expected format:
                      [domain, key_file, cert_file, full_chain_file, chain_file, timestamp]
    - domain (str): Root domain name on SSL cert: certificate common name (CN).
    - key_file (str): Path to SSL cert private key file, second argument in heroku certs:update.
    - cert_file (str): Path to SSL cert signed certificate file, first argument in heroku certs:update.
    - full_chain_file (str): Path to SSL cert full certificate chain file.
    - chain_file (str): Path to SSL intermediate certificates file.
    - timestamp (str): Timestamp when the SSL cert was created

"""
def deploy_cert(args):
    # Extract args
    domain, key_file, cert_file, full_chain_file, chain_file, timestamp = args

    # Get Heroku app Id for domain
    heroku_app_id = None
    try:
        heroku_app_id = get_heroku_app_id_for_domain(domain)
        logging.debug("Got Heroku Id=\"{}\" for domain=\"{}\"".format(heroku_app_id, domain))
    except ValueError as e:  # If ENV['HEROKU_AUTO_SSL_DOMAIN_MAPPING'] isn't set
        logging.exception("Failed to deploy certificate for domain=\"{}\", HEROKU_AUTO_SSL_DOMAIN_MAPPING environment variable not set".format(domain))
        return
    except SyntaxError as e:
        logging.exception("Failed to deploy certificate for domain=\"{}\", HEROKU_AUTO_SSL_DOMAIN_MAPPING syntax invalid".format(domain))
        return
    except KeyError as e:
        logging.exception("Failed to deploy certificate for domain=\"{}\", could not find Heroku App Id".format(domain))
        return

    command_parts = ["heroku", "certs:update", cert_file, key_file, "--app", heroku_app_id]
    print("Would run: $ {}".format(command_parts))

# END HOOKS


"""Main function called below
Called if __name__ is '__main__'

Args:
    - argv (object[]): Command lind arguments (With first filename arg from Python removed)
"""
def main(argv):
    # Register hooks that we handle
    operations = {
        'deploy_cert': deploy_cert
    }


    """Call Hook Handler
    Fields:
         hook_name (str): Name of hook, picked from argv[0], one of:
            - 'deploy_challenge'
            - 'clean_challenge'
            - 'deploy_cert'
            - 'unchanged_cert'
            - invalid_challenge'
            - 'request_failure'
            - 'exit_hook'
            (From: https://github.com/lukas2511/dehydrated/blob/master/docs/examples/hook.sh)
        hook_handler_args (str[]): Hook arguments, set by argv[1:]
    """
    hook_name = argv[0]
    hook_handler_args = argv[1:]

    # Log hook called
    logging.debug("Hook called. hook.name='{}', hook.args={}".format(hook_name, hook_handler_args))

    # Log more specific info depending on hook_name
    if hook_name not in operations:  # We don't handle this hook
        logging.debug("heroku-auto-ssl/hook.py doesn't currently handle: hook.name=\"{}\"".format(hook_name))
    elif hook_name in ['deploy_cert']:  # This hook could be considered a "security event"
        logging.info("heroku-auto-ssl/hook.py handled: hook.name=\"{}\", by: {}".format(hook_name, get_identifying_info()))
    else:  # Regular hook
        logging.debug("heroku-auto-ssl/hook.py handled: hook.name=\"{}\"".format(hook_name))

    # Call hook if we handle it
    if hook_name in operations:
        operations[hook_name](hook_handler_args)

# Call main
if __name__ == '__main__':
    # Setup logging
    logging.basicConfig(filename="heroku-auto-ssl.log",
                        level=logging.DEBUG,
                        format='%(asctime)s %(module)s %(name)s.%(funcName)s +%(lineno)s: %(levelname)-8s [%(process)d] %(message)s')
    logging.getLogger().addHandler(logging.StreamHandler())  # Make log to file and console

    # argv[1:] - Args after file name
    main(sys.argv[1:])
