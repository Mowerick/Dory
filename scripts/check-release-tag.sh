#!/usr/bin/env bash
# Checks that a release tag is v<N>, matches version-name in metadata.json and is on main.
set -euo pipefail

tag=$1

if [[ ! $tag =~ ^v[0-9]+$ ]]; then
  echo "Tag $tag is not of the form v<N>, such as v3." >&2
  exit 1
fi

version=${tag#v}
version_name=$(node -p "require('./metadata.json')['version-name']")
if [[ $version != "$version_name" ]]; then
  echo "Tag $tag is version $version, but metadata.json has version-name $version_name." >&2
  exit 1
fi

if ! git merge-base --is-ancestor HEAD origin/main; then
  echo "Tag $tag is not on main." >&2
  exit 1
fi
