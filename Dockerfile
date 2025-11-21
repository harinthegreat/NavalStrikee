# Use official PHP image (with Apache)
FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y git unzip zip libzip-dev \
    && docker-php-ext-install zip

RUN a2enmod rewrite

WORKDIR /var/www/html

# Copy only composer.json if composer.lock doesn't exist
COPY composer.json ./
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-dev --optimize-autoloader

COPY src/ /var/www/html/

RUN chown -R www-data:www-data /var/www/html

EXPOSE 8080