FROM node:14
# Create app directory
WORKDIR /app
# Install app dependencies
# COPY package*.json ./
# RUN npm install
# If you are building your code for production
# RUN npm ci --only=production
# Bundle app source
# COPY . .
ENV PORT 8080
# PORT
EXPOSE 8080
CMD [ "npm", "run", "start-dev" ]