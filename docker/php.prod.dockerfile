FROM composer:2 AS vendor

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

FROM php:8.5-fpm-alpine

# imagemagick / imagemagick-libs / libheif は runtime に残す (imagick 拡張と
# iPhone HEIC→JPEG 変換に必要)。imagemagick-dev は imagick のビルドにのみ要るので
# $PHPIZE_DEPS と一緒に最後に削除し、prod イメージを軽く保つ。
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    oniguruma-dev \
    linux-headers \
    imagemagick \
    imagemagick-libs \
    libheif \
    && apk add --no-cache --virtual .build-deps \
    imagemagick-dev \
    $PHPIZE_DEPS \
    && docker-php-ext-install \
    pdo \
    pdo_pgsql \
    mbstring \
    zip \
    bcmath \
    sockets \
    pcntl \
    && pecl install redis imagick \
    && docker-php-ext-enable redis imagick \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/*

# スマホ実機の写真アップロード用に上限を引き上げる。PHP 既定 (upload 2M /
# post 8M) だと施設写真などで弾かれるため、nginx-prod (20M) と整合させる。
# imagick での HEIC→JPEG 変換にメモリを使うので memory_limit も確保する。
RUN { \
    echo "upload_max_filesize = 20M"; \
    echo "post_max_size = 25M"; \
    echo "memory_limit = 256M"; \
    } > /usr/local/etc/php/conf.d/zz-uploads.ini

WORKDIR /var/www/html

COPY --from=vendor /app ./

RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
