module.exports = function(grunt) {

  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      default: {
        options: {
          fast: 'never' // disable the grunt-ts fast feature
        },
        tsconfig: true
      }
    },
    copy: {
      imgs: {
        expand: true,
        src: 'imgs/*.*',
        dest: 'dist/'
      },
    },
    concat: {
      options: {
        separator: '\n;\n',
      },
      dist: {
        // Order is important! gameLogic.js must be first because it defines myApp angular module.
        src: [
          'lib/angular.js',
          'lib/turnBasedServices.4.js',
          'ts_output_readonly_do_NOT_change_manually/src/gameLogic.js',
          'ts_output_readonly_do_NOT_change_manually/src/game.js'
        ],
        dest: 'dist/js/everything.js',
      },
    },
    postcss: {
      options: {
        map: {
          inline: false, // save all sourcemaps as separate files...
          annotation: 'dist/maps/' // ...to the specified directory
        },
        processors: [
          require('autoprefixer')(), // add vendor prefixes
          require('cssnano')({safe: true}) // minify the result, skipping unsafe optimizations
        ]
      },
      dist: {
        src: 'game.css',
        dest: 'dist/everything.min.css',
      }
    },
    uglify: {
      options: {
        sourceMap: true,
      },
      my_target: {
        files: {
          'dist/js/everything.min.js': ['dist/js/everything.js']
        }
      }
    },
    processhtml: {
      dist: {
        files: {
          'dist/index.min.html': ['index.html']
        }
      }
    },
    manifest: {
      generate: {
        options: {
          basePath: '.',
          cache: [
            'js/everything.min.js',
            'everything.min.css',
            "imgs/blackStone.svg",
            "imgs/whiteStone.svg",
            'fonts/roboto/d-6IYplOFocCacKzxwXSOKCWcynf_cDxXwCLxiixG1c.ttf',
          ],
          network: [
            // I do '*' because we need to load avatars from FB and maybe other places on the web (also 'service-worker.js')
            '*'
          ],
          timestamp: true
        },
        dest: 'dist/index.min.appcache',
        src: []
      }
    },
  });

  require('load-grunt-tasks')(grunt);

  // Default task(s).
  grunt.registerTask('default', [
      'ts',
      'copy',
      'concat', 'postcss', 'uglify',
      'processhtml', 'manifest']);
};
