if [ -d "build" ]; then
    rm -rf build/assets
    rm -rf build/pages
else
    mkdir build
fi
cd client && nijor build && cd ../ && mv client/build/assets build/assets && mv client/build/pages build/pages && rm -rf client/build
cd server && bun bundle.js && cd ../