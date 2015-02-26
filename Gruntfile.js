module.exports = function(grunt) {

	grunt
		.initConfig({
			pkg : grunt.file.readJSON('package.json'),
			// LINT
			jshint : {
				all : ['*.js']
			},
			release : {
				options : {
					npm: false,
					npmtag: false
				}
			}
		});
	grunt.loadNpmTasks('grunt-release');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.registerTask('default', ['jshint']);
};
