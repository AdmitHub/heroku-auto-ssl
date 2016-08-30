# Sign text
In this directory are `.txt` files which contain text signed by the key 
defined in `../test-key`.

# Text
Below is a directory of filenames and the text that has been signed to create 
their contents.

**Note:** Some entries will be marked as having been signed with `wrong keypair`. 
This denotes that these entries have been signed with a keypair which the public 
key has not been provided for. So if you setup a test environment and use the 
public key provided with this test data the `libchlngproto` library should mark 
requests with body's signed with `wrong keypair` as being invalid.  
(Correct keypair id: `6026EBD2`, Wrong keypair id: `2A8D2B88`).

- `01.txt` => `OK?`
- `02.txt` => `url=/sslverify&content=supersecret`
- `03.txt` => `OK?`
	- Signed with `wrong keypair`
- `04.txt` => `url=/sslverify&content=supersecret`
	- Signed with `wrong keypair`
- `05.txt` => `OK!`
- `06.txt` => `url=doesnt_provide_content_key`
- `07.txt` => `content=doesnt_provide_url_key`
