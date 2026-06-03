# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# base — общие системные зависимости и расширения PHP
# ---------------------------------------------------------------------------
FROM php:8.5-fpm-alpine AS base

# libpq-dev replaces the non-existent postgresql-dev package in Alpine 3.21+
# opcache is already compiled into php:8.5-fpm-alpine — no need to install it
RUN apk add --no-cache \
        libpq-dev \
        libzip-dev \
        oniguruma-dev \
    && docker-php-ext-install \
        pdo_pgsql \
        pcntl \
        bcmath \
        zip \
    && rm -rf /tmp/*

# Redis PECL extension — build tools are installed and removed in one layer
RUN apk add --no-cache --virtual .phpize-build $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .phpize-build \
    && rm -rf /tmp/* /root/.pearrc

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ---------------------------------------------------------------------------
# dev — dev-зависимости, монтируется volume с кодом
# ---------------------------------------------------------------------------
FROM base AS dev

COPY docker/php/php.ini /usr/local/etc/php/conf.d/app.ini

COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader

COPY . .
RUN composer dump-autoload --optimize

# ---------------------------------------------------------------------------
# production — оптимизированный образ без dev-зависимостей
# ---------------------------------------------------------------------------
FROM base AS production

ENV APP_ENV=production
ENV APP_DEBUG=false

COPY docker/php/php.ini /usr/local/etc/php/conf.d/app.ini

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

COPY . .
RUN composer dump-autoload --optimize \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

USER www-data
