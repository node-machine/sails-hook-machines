/**
 * Module dependencies
 */

var Path = require('path');
var _ = require('lodash');
var Machine = require('machine');
var Filesystem = require('machinepack-fs');
var async = require('async');


/**
 * MachinesHook
 *
 * @param  {SailsApp} sails
 * @return {Object}
 */

module.exports = function MachinesHook (sails) {

  return {

    defaults: {
      __configKey__: {
        // Run `npm install` on subfolders
        installDependencies: false
      }
    },

    loadMachines: function (cb) {
      // Get a reference to the "exec" function
      var exec = require("child_process").exec;
      var self = this;
      // Create an async queue to make sure "npm install" calls don't overlap
      this.npmQueue = async.queue(function(dir, qcb) {
        // If installDependencies is enabled, run npm install
        if (sails.config[self.configKey].installDependencies) {
          sails.log.silly("NPM INSTALL ", dir);
          // Run "npm install"
          exec("npm install", {cwd: dir}, function(err, stdout, stderr) {
            if (stderr && stderr.match(/^npm ERR!/m)) {
              sails.log.silly(stderr);
              self.npmQueue.kill();
              var errMsg = "\nCould not install dependencies.  Please try running again as root/administrator (using `sudo` on OS X or Linux).";
              return cb(errMsg);
            }
            sails.log.silly(stdout);
            if (err) {
              self.npmQueue.kill();
              return cb(err);
            }
            return after();
          });
        }
        // Otherwise just load the machine pack
        else {
          return after();
        }
        function after() {
          // Load the machine pack
          sails.machines[Path.basename(dir)] = require(dir);
          return qcb();
        }
      }, 1);

      // Once all the npm install tasks are done, call the callback
      // that will indicate that the hook is finished
      this.npmQueue.drain = cb;

      // Collection of loaded machines and packs
      sails.machines = {};

      var machineDir = Path.resolve(sails.config.appPath, sails.config.paths.machines || 'api/machines');
      // Strip trailing slash if any
      if (machineDir.substr(-1) == Path.sep) {
        machineDir = machineDir.substr(0, machineDir.length - 1);
      }
      async.auto({
        entries: function(cb) {
          Filesystem.ls({
            dir: machineDir,
            depth: 2
          }).exec(function (err, entries) {
            if (err) {
              if (err.code == 'ENOENT') {
                return cb();
              }
              return cb(err);
            }
            return cb(null, entries);
          });
        },
        dirs: function(cb) {
          Filesystem.ls({
            dir: machineDir,
            depth: 1,
            types: ["dir"]
          }).exec(function (err, dirs) {
            if (err) {
              if (err.code == 'ENOENT') {
                return cb();
              }
              return cb(err);
            }
            return cb(null, dirs);
          });
        }
      }, function done(err, results) {
        if (err) {return cb(err);}
        if (!results.entries) {
          return cb();
        }

        var machineDirLength = machineDir.length + 1;
        var topLevelFiles = _.reduce(results.entries, function(memo, machinePath) {
          if (
            // Must be a script
            (machinePath.match(/\.js$/) || machinePath.match(/\.coffee$/) || machinePath.match(/\.cs$/)) &&
            // Must be in the top level
            machinePath.substr(machineDirLength).split(Path.sep).length == 1
          ) {
            memo.push(machinePath);
          }
          return memo;
        }, []);

        // Clear the require cache of all top-level machines
        // in case we're reloading
        _.each(topLevelFiles, function(file) {
          delete require.cache[file];
        });

        // Try to get all of the top level files into a pack
        sails.machines = Machine.pack({
          pkg: {
            machinepack: {
              machines: (function mapToBasename(){
                return _.map(topLevelFiles, function (path){
                  return Path.basename(path, '.js');
                });
              })()
            }
          },
          dir: machineDir
        });

        // If there are no subdirectories to load, we're done.
        if (!results.dirs.length) {return cb();}

        // Examine the subdirectories
        _.each(results.dirs, function(dir) {
          // If it has a package.json, try to load it as a machine pack
          var packageJson = Path.resolve(dir, "package.json");
          if (results.entries.indexOf(packageJson) > -1) {
            try {

              // Load the package.json
              packageJson = require(packageJson);
              // If it has a "machinepack" key, try to load it as a machinepack
              if (packageJson.machinepack) {
                // Clear the require cache in case we're reloading
                var regex = new RegExp(dir);
                _.each(_.keys(require.cache), function(filePath) {
                  if (filePath.match(regex)) {
                    delete require.cache[filePath];
                  }
                });
                // Queue up the pack for npm install
                self.npmQueue.push(dir);
              }
            } catch(e) {console.log(e);}
          }

        });

      });

    },

    initialize: function(cb) {
      this.loadMachines(cb);
    }
  };

};
