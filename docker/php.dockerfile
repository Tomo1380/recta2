FROM php:8.5-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    oniguruma-dev \
    linux-headers \
    imagemagick \
    imagemagick-libs \
    imagemagick-dev \
    libheif \
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
    && docker-php-ext-enable redis imagick

# スマホ実機の写真アップロード用に上限を引き上げる。PHP 既定 (upload 2M /
# post 8M) だと施設写真などで弾かれるため、nginx (20M) と整合させる。
# imagick での HEIC→JPEG 変換にメモリを使うので memory_limit も確保する。
RUN { \
    echo "upload_max_filesize = 20M"; \
    echo "post_max_size = 25M"; \
    echo "memory_limit = 256M"; \
    } > /usr/local/etc/php/conf.d/zz-uploads.ini

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY ./backend .

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

EXPOSE 9000

CMD ["php-fpm"]
