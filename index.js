/**
 * Module dependencies
 */

var Path = require('path');
var _ = require('lodash');
var Machine = require('machine');
var Filesystem = require('machinepack-fs');



/**
 * MachinesHook
 *
 * @param  {SailsApp} sails
 * @return {Object}
 */

module.exports = function MachinesHook (sails) {
  return {

    initialize: function (cb) {

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
            type: ["dir"]
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
                sails.machines[Path.basename(dir)] = require(dir);
              }
            } catch(e) {}
          }

        });

        return cb();

      });

    }
  };
};
