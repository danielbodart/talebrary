#!/usr/bin/env bash

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


function deno() {
  unset -f deno
  if [[ ! $(asdf plugin list) =~ deno ]]; then
    echo "* Downloading and installing deno plugin..."
    asdf plugin add deno > /dev/null 2>&1
  fi
  asdf install deno > /dev/null 2>&1
  deno "$@"
}
export -f deno


function denoflare() {
  unset -f denoflare
  if [[ ! $(command -v denoflare) ]]; then
    deno install --unstable-worker-options --allow-read --allow-net --allow-env --allow-run --name denoflare --force "https://raw.githubusercontent.com/skymethod/denoflare/v0.6.0/cli/cli.ts"
    asdf reshim deno
  fi
  denoflare "$@"
}
export -f denoflare


function rclone() {
  unset -f rclone
  if [[ ! $(command -v rclone) ]]; then
    sudo -v ; curl https://rclone.org/install.sh | sudo bash
  fi
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


function npx() {
  unset -f npx
  if [[ ! $(command -v npx) ]]; then
    echo "* Downloading and installing npx ..."
    npm install -g npx > /dev/null 2>&1
    asdf reshim nodejs
  fi
  npx "$@"
}
export -f npx


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