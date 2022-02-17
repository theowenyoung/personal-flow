.Phony: run update local install github
run:
	ENV=dev DENO_DIR=./deno_dir deno run -A --unstable https://deno.land/x/denoflow@0.0.30/cli.ts run
github:
	DENO_DIR=./deno_dir deno run -A --unstable https://deno.land/x/denoflow@0.0.30/cli.ts run
update:
	DENO_DIR=./deno_dir deno cache --reload https://deno.land/x/denoflow@0.0.30/cli.ts
test:
	deno test -A --unstable
local:
	ENV=dev deno run -A --unstable ../../denoflow/denoflow/cli.ts run
install:
	PUPPETEER_PRODUCT=chrome DENO_DIR=./deno_dir deno run -A --unstable https://deno.land/x/puppeteer@9.0.2/install.ts
