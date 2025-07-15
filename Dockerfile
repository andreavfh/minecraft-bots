
FROM node:20

WORKDIR /app

COPY . .

# Instala dependencias
RUN npm install

CMD ["npm", "start"]
