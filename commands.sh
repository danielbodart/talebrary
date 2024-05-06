#!/usr/bin/env bash

# Just in time installers, these functions replace themselves with the real command when called for the first time

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
  asdf install
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

