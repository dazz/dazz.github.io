
serve: stop
	docker compose up -d

stop:
	docker compose stop

ci-github: ## Run github pipeline to validate workflow (prevent push-and-pray)
	act push --platform ubuntu-latest=catthehacker/ubuntu:act-latest