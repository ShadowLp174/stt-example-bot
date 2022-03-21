cp config.json ./update-backup-config.json
git checkout .
branch=$(git branch --show-current)
git pull origin $branch
npm install
cp update-backup-config.json ./config.json
node command-deployer.js
