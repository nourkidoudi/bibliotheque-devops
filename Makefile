.PHONY: up down build logs restart clean seed ps

up:
	docker-compose up -d --build

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

build:
	docker-compose build

ps:
	docker-compose ps

seed:
	@echo "Seeding users-service..."
	docker-compose exec -T users-service node seed.js
	@echo "Seeding books-service..."
	docker-compose exec -T books-service node seed.js
	@echo "Seeding complete!"

clean:
	docker-compose down -v --rmi all --remove-orphans
