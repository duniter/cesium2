#!/bin/bash
# Get to the root project
if [[ "_" == "_${PROJECT_DIR}" ]]; then
  cd ..
  PROJECT_DIR=`pwd`
  export PROJECT_DIR
fi;

# Preparing Android environment
. ${PROJECT_DIR}/scripts/env-android.sh
if [[ $? -ne 0 ]]; then
  exit 1
fi

cd ${PROJECT_DIR}

# Run the build
echo "Running cordova build..."
ionic cordova build android --warning-mode=none --color
#ionic cordova build android --warning-mode=none --color --verbose
