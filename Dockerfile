
FROM node:20

WORKDIR /app

COPY . .

# Instala dependencias
RUN npm install

CMD ["node", "bots.mjs", "reinosmc.net", "2"]
