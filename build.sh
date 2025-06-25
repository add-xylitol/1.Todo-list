#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Debug: List files in the current directory
echo "--- Current directory: $(pwd) ---"
ls -la

# Navigate to the flutter_app directory
echo "--- Navigating to flutter_app ---"
cd flutter_app

# Debug: List files in the flutter_app directory
echo "--- Current directory: $(pwd) ---"
ls -la

# Install Flutter dependencies
echo "--- Installing Flutter dependencies ---"
flutter pub get

# Build the Flutter web application
echo "--- Building Flutter web application ---"
flutter build web

# Debug: Check if the build/web directory exists and list its contents
echo "--- Checking build/web directory ---"
if [ -d "build/web" ]; then
  echo "--- build/web directory exists. Contents: ---"
  ls -la build/web
else
  echo "--- ERROR: build/web directory does not exist after build! ---"
  # Debug: List the contents of the build directory to see what's there
  if [ -d "build" ]; then
    echo "--- Contents of build directory: ---"
    ls -la build
  else
    echo "--- ERROR: build directory does not even exist! ---"
  fi
  exit 1
fi

# Navigate back to the root directory
echo "--- Navigating back to the root directory ---"
cd ..

# Debug: List files in the root directory again
echo "--- Current directory: $(pwd) ---"
ls -la

echo "Build script finished successfully."