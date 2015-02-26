module.exports = function(grunt) {

	grunt
		.initConfig({
			pkg : grunt.file.readJSON('package.json'),
			// LINT
			jshint : {
				options : {
					sub : true, // Allow object['member'], and don't insist on object.member
				},
				all : ['*.js']
			},
			uglify : {
				all : {
					files : {
						'dist/open-fb.min.js' : ['openfb.js']
					}
				}
			},
			shell : {
				commit_dist : {
					command : 'git commit -am "Release" dist/*.js'
				}
			},
			release : {
				options : {
					npm: false,
					npmtag: false
				}
			}
		});
	grunt.loadNpmTasks('grunt-release');
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.registerTask('default', ['jshint', 'uglify']);
};
