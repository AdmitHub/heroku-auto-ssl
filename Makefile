setup-hooks:
	./hooks/setup-hooks.sh

d-run:
	./dehydrated/dehydrated --register --accept-terms
	./dehydrated/dehydrated -c -k "./hooks/heroku-auto-ssl/hook.py"
