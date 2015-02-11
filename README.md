# machines

`machines` hook for Sails v0.11.

A more structured alternative to services and/or model methods. Loads app-level machines from your `api/machines` folder and exposes them as `sails.machines.*`

## Status

> ##### Stability: [2](http://nodejs.org/api/documentation.html#documentation_stability_index) - Unstable


## Purpose

This hook's responsibilities are:

#### When initialized...
+ load machine defs w/ dash-delimited filenames from `api/machines/`
+ instantiate a machinepack, creating living versions of all of the machines with camel-cased method names
+ expose the app's custom machinepack as `sails.machines`

#### Bind "shadow" routes...

###### `before`
N/A

###### `after`
N/A

#### Expose on the `sails` app object:

+ `sails.machines.*` (see reference documentation for sails.machines on sailsjs.org)

## FAQ

> If you have a question that isn't covered here, please feel free to send a PR adding it to this section.

#### What is this?

This repo contains a hook, one of the building blocks Sails is made out of.

#### What version of Sails is this for?

The versioning of a hook closely mirrors that of the Sails version it depends on.  While the "patch" version (i.e. the "Z" in "X.Y.Z") will normally differ from that of Sails core, the "minor" version number (i.e. the "Y" in "X.Y.Z") of this hook is also the minor version of Sails for which it is designed.  For instance, if a hook is version `0.11.9`, it is designed for Sails `^0.11.0` (that means it'll work from 0.11.0 all the way up until 0.12.0).



## License

MIT
