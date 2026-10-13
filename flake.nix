{
  description = "Dory: a GNOME Shell top-bar menu of the shell and terminal shortcuts you keep forgetting";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-26.05";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
      version = self.shortRev or self.dirtyShortRev or "dev";
    in
    {
      packages = forAllSystems (pkgs: {
        default = pkgs.callPackage ./package.nix { inherit version; };
      });

      overlays.default = final: prev: {
        gnomeExtensions = prev.gnomeExtensions // {
          dory = final.callPackage ./package.nix { inherit version; };
        };
      };

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs
            pkgs.glib
            pkgs.zip
            pkgs.unzip
          ];
        };
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt);
    };
}
