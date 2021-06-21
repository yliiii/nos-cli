const path = require('path')
const gulp = require('gulp')
const header = require('gulp-header')
const runSequence = require('gulp4-run-sequence').use(gulp)

const BIN_DIR = path.resolve(__dirname, 'bin')

const tasks = {
  copyFile: function() {
    return gulp.src('./dist/**/*.*', { allowEmpty: true })
      .pipe(gulp.dest(BIN_DIR))
  },
  appendEnv: function() {
    return gulp.src(BIN_DIR + '/index.js', { allowEmpty: true })
      .pipe(header('#!/usr/bin/env node \n'))
      .pipe(gulp.dest(BIN_DIR))
  }
}

Reflect.ownKeys(tasks).forEach(task=>gulp.task(task, tasks[task]))

gulp.task('build', function(cb) {
  runSequence('copyFile', 'appendEnv', cb)
})