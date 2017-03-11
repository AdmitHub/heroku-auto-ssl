setup-hooks:
	./hooks/setup-hooks.sh

link-hooks:
	cd dehydrated && ln -s ../hooks hooks

d-run:
	./dehydrated/dehydrated --register --accept-terms
	./dehydrated/dehydrated -c -k "dehydrated/hooks/heroku-auto-ssl/hook.py"
