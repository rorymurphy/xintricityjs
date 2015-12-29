var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    del = require('del'),
    rename = require("gulp-rename"),
    addsrc = require('gulp-add-src');

//delete the output file(s)
gulp.task('clean', function (cb) {
    //del is an async function and not a gulp plugin (just standard nodejs)
    //It is important to pass in the callback function so del can
    //  notify gulp when this task is complete.
    //  Without the callback, gulp will attempt to proceed with the
    //  next task before the del function is actually done delete the files.
    del(['xintricity.js', 'xintricity.min.js'], cb);
});

gulp.task('concatenate', function() {
  return gulp.src([
    'license.txt',
    'src/xin-util.js',
    'src/base/base-prologue.js',
    'src/base/base-helpers.js',
    'src/xin-events.js',
    'src/base/base-model.js',
    'src/base/base-collection.js',
    'src/base/base-sync.js',
    'src/base/base-history.js',
    'src/base/base-router.js',
    'src/base/base-epilogue.js',
    'src/xin-template-manager.js',
    'src/xin-model.js',
    'src/xin-mvvm.js'
  ])
  .pipe(concat('xintricity.js'))
  .pipe(gulp.dest('.'));
});

gulp.task('compress', ['concatenate'], function() {
  return gulp.src('./xintricity.js')
  .pipe(uglify({
    mangle: false
  }))
  .pipe(addsrc.prepend('license.txt'))
  .pipe(concat('xintricity.min.js'))
  .pipe(gulp.dest('.'));
});



gulp.task('default', ['clean', 'concatenate', 'compress'], function() {});
