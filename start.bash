npx tsc
esbuild ./dist/client/client.js --bundle --outfile=./dist/client/client.js --allow-overwrite
esbuild ./dist/index.js --platform=node --bundle --outfile=./dist/index.js --allow-overwrite
cp ./src/client/index.html ./dist/client
cp ./src/client/style.css ./dist/client
cp -r ./src/client/images/. ./dist/client/images
cp ./src/client/favicon.ico ./dist/client
cp ./src/client/Menlo-Regular.ttf ./dist/client
node ./dist/index.js