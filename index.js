/**
 * Module dependencies
 */

var Path = require('path');
var _ = require('lodash');
var MachineFactory = require('machine');
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
      var machineDir = Path.resolve(sails.config.appPath, sails.config.paths.machines || 'api/machines');

      Filesystem.ls({
        dir: machineDir
      }).exec(function (err, paths) {
        if (err) {
          return cb(err);
        }

        // Expose the app's built-in machinepack (`api/machines/*.js`)
        // as `sails.machines`:
        sails.machines = MachineFactory.pack({
          pkg: {
            machinepack: {
              machines: (function mapToBasename(){
                return _.map(paths, function (path){
                  return Path.basename(path, '.js');
                });
              })()
            }
          },
          dir: machineDir
        });

        return cb();
      });

    }
  };
};
