{
  lib,
  buildNpmPackage,
  glib,
  version ? "dev",
}:
let
  metadata = lib.importJSON ./metadata.json;
in
buildNpmPackage {
  pname = "gnome-shell-extension-dory";
  inherit version;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./metadata.json
      ./package-lock.json
      ./package.json
      ./schemas
      ./shortcuts.json
      ./src
      ./stylesheet.css
      ./tsconfig.json
    ];
  };

  npmDepsHash = "sha256-RzXhEQRZQdCoBjqctUJCPIVEiSrY5lQzLK96A9N/owQ=";

  nativeBuildInputs = [ glib ];

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/gnome-shell/extensions
    cp -r dist $out/share/gnome-shell/extensions/${metadata.uuid}
    runHook postInstall
  '';

  passthru.extensionUuid = metadata.uuid;

  meta = {
    description = metadata.description;
    platforms = lib.platforms.linux;
  };
}
