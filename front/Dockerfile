FROM nginx:alpine

# Remove config default
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Static files
COPY ./src /usr/share/nginx/html

EXPOSE 80
