#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Just in time installers, these functions replace themselves with the real command when called for the first time

function curl() {
  unset -f curl
  if [[ ! $(command -v curl) ]]; then
    sudo apt install -y curl
  fi
  curl "$@"
}
export -f curl


function asdf() {
  unset -f asdf
  if [[ ! -f "$HOME/.asdf/asdf.sh" ]]; then
    echo "* Downloading and installing asdf..."
    git clone -c advice.detachedHead=false https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.12.0 > /dev/null 2>&1
  fi
  . "$HOME/.asdf/asdf.sh"
  asdf "$@"
}
export -f asdf


function rclone() {
  unset -f rclone
  if [[ ! $(asdf plugin list) =~ rclone ]]; then
    echo "* Downloading and installing rclone plugin..."
    asdf plugin add rclone > /dev/null 2>&1
  fi
  asdf install rclone > /dev/null 2>&1
  rclone "$@"
}
export -f rclone


function node() {
  unset -f node
  if [[ ! $(asdf plugin list) =~ nodejs ]]; then
    echo "* Downloading and installing node plugin..."
    asdf plugin add nodejs > /dev/null 2>&1
  fi
  asdf install nodejs > /dev/null 2>&1
  node "$@"
}
export -f node


function npm() {
  unset -f npm
  node -v > /dev/null 2>&1
  npm "$@"
}
export -f npm


function wrangler() {
  unset -f wrangler
  if [[ ! $(command -v wrangler) ]]; then
    echo "* Downloading and installing wrangler ..."
    npm install -g wrangler > /dev/null 2>&1
    asdf reshim nodejs
  fi
  wrangler "$@"
}
export -f wrangler


function bun() {
  unset -f bun
  if [[ ! $(asdf plugin list) =~ bun ]]; then
    echo "* Downloading and installing bun plugin..."
    asdf plugin add bun > /dev/null 2>&1
  fi
  asdf install bun > /dev/null 2>&1
  bun "$@"
}
export -f bun