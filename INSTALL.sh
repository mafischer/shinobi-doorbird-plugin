npm install
pm2 startup
pm2 start lib/index.js --name doorbird --wait-ready
pm2 save