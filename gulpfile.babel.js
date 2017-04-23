import gulp from 'gulp';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import sass from 'gulp-sass';
import autoprefixer from 'gulp-autoprefixer';
import browser from 'browser-sync';

import handleErrors from './gulp/tasks/handleErrors';

gulp.task('build', () => {
  browserify({
    'entries': ['./src/main.es6']
  })
  .bundle()
  .on('error', handleErrors)
  .pipe(source('docs/main.js'))
  .pipe(gulp.dest('./'));
});

gulp.task('watch', () => {
  gulp.watch('./src/*.es6', ['build']);
});

gulp.task('bootstrap', () => {
  gulp.src('./scss/style.scss')
  .pipe(sass({
    includePaths: ['bower_components/bootstrap/scss']
  })
  .on('error', sass.logError))
  .pipe(autoprefixer())
  .pipe(gulp.dest('./docs/css'));
});

gulp.task('browser', () => {
  browser({
    server: {
      baseDir: './docs'
    }
  });
  gulp.watch('./docs/*', () => browser.reload());
});

gulp.task('default', ['build', 'watch', 'browser']);