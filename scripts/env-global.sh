#!/bin/bash
# Get to the root project
if [[ ! -d "${PROJECT_DIR}" ]]; then
  cd ..
  PROJECT_DIR=`pwd`
fi;
if [[ ! -f "${PROJECT_DIR}/package.json" ]]; then
  echo "Invalid project dir: file 'package.json' not found in ${PROJECT_DIR}"
  echo "-> Make sure to run the script inside his directory, or export env variable 'PROJECT_DIR'"
  exit 1
fi;

echo "Preparing project environment.."
NODEJS_VERSION=10

#ANDROID_NDK_VERSION=r19c
ANDROID_SDK_VERSION=r29.0.0
ANDROID_SDK_TOOLS_VERSION=4333796
ANDROID_SDK_ROOT=/usr/lib/android-sdk
ANDROID_SDK_TOOLS_ROOT=${ANDROID_SDK_ROOT}/build-tools

#JAVA_HOME=

GRADLE_VERSION=4.10.3
CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL=https\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-all.zip

# Override with a local file, if any
if [[ -f "${PROJECT_DIR}/.local/env.sh" ]]; then
  echo "Loading environment variables from: '.local/env.sh'"
  source ${PROJECT_DIR}/.local/env.sh
  if [[ $? -ne 0 ]]; then
    exit 1
  fi
else
  echo "No file '${PROJECT_DIR}/.local/env.sh' found. Will use defaults"
fi

# Checking Java installed
if [[ "_" == "_${JAVA_HOME}" ]]; then
  JAVA_CMD=`which java`
  if [[ "_" == "_${JAVA_CMD}" ]]; then
    echo "No Java installed. Please install java, or set env variable JAVA_HOME "
    exit 1
  fi
fi

# Checking Android SDK
if [[ "_" == "_${ANDROID_SDK_ROOT}" ]]; then
  echo "Please set env variable ANDROID_SDK_ROOT "
  exit 1
fi
if [[ ! -d "${ANDROID_SDK_ROOT}" ]]; then
  echo "Invalid path for ANDROID_SDK_ROOT: ${ANDROID_SDK_ROOT} is not a directory"
  exit 1
fi

# Export useful variables
export PROJECT_DIR \
  JAVA_HOME \
  ANDROID_SDK_ROOT \
  ANDROID_SDK_TOOLS_ROOT \
  CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL

# Node JS
export NVM_DIR="$HOME/.nvm"
if [[ -d "${NVM_DIR}" ]]; then

    # Load NVM
    . ${NVM_DIR}/nvm.sh

    # Switch to expected version
    nvm use ${NODEJS_VERSION}

    # Or install it
    if [[ $? -ne 0 ]]; then
        nvm install ${NODEJS_VERSION}
        if [[ $? -ne 0 ]]; then
            exit 1;
        fi
    fi
else
    echo "nvm (Node version manager) not found (directory ${NVM_DIR} not found). Please install, and retry"
    exit -1
fi

# Install global dependencies
IONIC_PATH=`which ionic`
CORDOVA_PATH=`which cordova`
if [[ "_" == "_${IONIC_PATH}" || "_" == "_${CORDOVA_PATH}" ]]; then
  echo "Installing global dependencies..."
  npm install -g cordova ionic
  if [[ $? -ne 0 ]]; then
      exit 1
  fi
fi

# Install project dependencies
if [[ ! -d "${PROJECT_DIR}/node_modules" ]]; then
    echo "Installing project dependencies..."
    cd ${PROJECT_DIR}
    npm install
fi
