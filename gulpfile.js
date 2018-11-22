const path = require('path')
const gulp = require('gulp')
const header = require('gulp-header')
const runSequence = require('run-sequence')

const BIN_DIR = path.resolve(__dirname, 'bin')

const tasks = {
  copyFile: function() {
    return gulp.src('./dist/**/*.*')
      .pipe(gulp.dest(BIN_DIR))
  },
  appendEnv: function() {
    gulp.src(BIN_DIR + '/index.js')
      .pipe(header('#!/usr/bin/env node \n'))
      .pipe(gulp.dest(BIN_DIR))
  }
}

Reflect.ownKeys(tasks).forEach(task=>gulp.task(task, tasks[task]))

gulp.task('build', function(cb) {
  runSequence('clean', 'copyFile', 'appendEnv', cb)
})