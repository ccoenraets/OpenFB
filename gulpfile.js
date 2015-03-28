var gulp    = require('gulp');
var fs      = require('fs');
var $       = require('gulp-load-plugins')();


gulp.task('build', function() {
    gulp.src('./bin/ngOpenFB.coffee')
    .pipe($.coffee())
    .pipe($.replace('/*inject:ngCordova */', function() {
        return fs.readFileSync('./bin/ngCordova.js');
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('build-min', function() {
    gulp.src('./ngOpenFB.js')
    .pipe($.uglifyjs('ngOpenFB.min.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['build', 'build-min']);

