import socket, ssl, sys, traceback

"""
!!! ATTENTION !!!

    THIS SCRIPT WILL ONLY WORK IF THERE IS A FILE 
    AT /etc/ssl/certs/ca-certificates.crt FULL OF 
    TRUSTED CA CERTIFICATES

!!! ATTENTION !!!

#
# Overview
#
This file will check all the certificates in the file domains.master.txt to see 
if their SSL certificates expire in the next 7 days.

It then puts all the domains that expire in the next 7 days in a file called 
domains.txt. This domains.txt file designates which domains the dehydrated Lets 
Encrypt tool will retrieve ssl certificates for. This file will then run the 
dehydrated tool for those domains, and delete the domains.txt file.

If no domains need updating then no domains.txt file will be created. If one 
exists it will be deleted. And the dehydrated tool will not be run.
"""

# Read domains.master.txt
domains = []
with open("domains.master.txt", "r") as f:
    # Read contents
    contents = f.read()

    # Split by spaces
    domains = contents.split()

    # Remove first element, it is the root domain
    domains.pop(0)

for domain in domains:
    print("Checking {}".format(domain))

    # Create an SSL socket to get SSL info with
    sock = False
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    except Exception as e:
        print("    Failed to create normal socket", e)
        traceback.print_exc()
        print("    exiting...")
        sys.exit()

    # Require ssl cert from server
    ssl_sock = False
    try:
        ssl_sock = ssl.wrap_socket(sock, 
                                   ca_certs="/etc/ssl/certs/ca-certificates.crt",
                                   cert_reqs=ssl.CERT_REQUIRED)
    except Exception as e:
        print("    Failed to create ssl socket", e)
        traceback.print_exc()
        print("    exiting...")
        sys.exit()

    try:
        ssl_sock.connect((domain, 443))
    except Exception as e:
        print("    Failed to connect", e)
        traceback.print_exc()
        print("    exiting...")
        sys.exit()


    try:
        print(ssl_sock.getpeercert())
    except Exception as e:
        print("    Failed to get ssl cert info", e)
        traceback.print_exc()
        print("    exiting...")
        sys.exit()

    try:
        ssl_sock.close()
    except Exception as e:
        print("    Failed to close socket", e)
        traceback.print_exc()
        print("    exiting...")
        sys.exit()

