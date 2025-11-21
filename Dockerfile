# Use official PHP image (with Apache)
FROM php:8.2-apache

# Install dependencies for Composer and PHP extensions if needed
RUN apt-get update \
    && apt-get install -y git unzip zip libzip-dev \
    && docker-php-ext-install zip

# Enable Apache mod_rewrite if you need it (common for PHP apps)
RUN a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

# Copy composer files and install dependencies first (for better caching)
COPY composer.json composer.lock ./
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-dev --optimize-autoloader

# Copy the rest of your application code (including src/)
COPY src/ /var/www/html/

# Ensure Apache runs as the correct user
RUN chown -R www-data:www-data /var/www/html

# Expose port 80
EXPOSE 8080