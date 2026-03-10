FROM php:8.5-cli-alpine

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    oniguruma-dev \
    linux-headers \
    $PHPIZE_DEPS \
    && docker-php-ext-install \
    pdo \
    pdo_pgsql \
    mbstring \
    zip \
    bcmath \
    sockets \
    pcntl

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY ./backend/composer.json ./backend/composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

COPY ./backend .

RUN composer dump-autoload --optimize \
    && php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear \
    && chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Parse DATABASE_URL into individual DB_* vars, then run migrations + serve
CMD sh -c '\
    if [ -n "$DATABASE_URL" ]; then \
        export DB_HOST=$(echo $DATABASE_URL | sed -E "s|.*@([^:/]+).*|\1|"); \
        export DB_PORT=$(echo $DATABASE_URL | sed -E "s|.*:([0-9]+)/.*|\1|"); \
        export DB_DATABASE=$(echo $DATABASE_URL | sed -E "s|.*/([^?]+).*|\1|"); \
        export DB_USERNAME=$(echo $DATABASE_URL | sed -E "s|.*://([^:]+):.*|\1|"); \
        export DB_PASSWORD=$(echo $DATABASE_URL | sed -E "s|.*://[^:]+:([^@]+)@.*|\1|"); \
    fi && \
    php artisan migrate --force && \
    php artisan serve --host=0.0.0.0 --port=${PORT:-8080}'
