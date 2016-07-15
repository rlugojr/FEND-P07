var critical = require('critical');
var gulp = require('gulp'),
  gutil = require('gulp-util'),
  csslint = require('gulp-csslint'),
  jshint = require('gulp-jshint'),
  htmlhint = require('gulp-htmlhint'),
  bootlint = require('gulp-bootlint'),
  del = require('del'),
  concat = require('gulp-concat'),
  googlecdn = require('gulp-google-cdn'),
  jsmin = require('gulp-jsmin'),
  htmlmin = require('gulp-htmlmin'),
  csso = require('gulp-csso'),
  imagemin = require('gulp-imagemin'),
  zopfli = require('imagemin-zopfli'),//imagemin plugin
  pngcrush = require('imagemin-pngcrush'),//imagemin plugin
  jpegrecompress = require('imagemin-jpeg-recompress'),//imagemin plugin
  responsive = require('gulp-responsive'),
  rename = require('gulp-rename'),
  sourcemaps = require('gulp-sourcemaps'),
  replace = require('gulp-replace');
  runSequence = require('run-sequence'),
  rev = require('gulp-rev'),
  pump = require('pump'),
  reporters = require('reporters'),
  logCapt = require('gulp-log-capture');
  
//set report collection level
reporters.debug = true;

//run validation checks
gulp.task('html_check',function() {
  gulp.src('src/**/*.html')
    .pipe(htmlhint())
    .pipe(htmlhint.reporter());
});


gulp.task('css_check', function() {
  gulp.src('src/**/*.css')
    .pipe(csslint())
    .pipe(csslint.reporter(reporters('gulp-csslint')));
});

gulp.task('js_check', function() {
  return gulp.src('src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter(reporters('gulp-jshint')));
});

gulp.task('checkBoot', function(){
    return gulp.src('src/views/pizza.html')
    .pipe(bootlint({
            loglevel: 'debug',
            reportFn: function(file, lint, isError, isWarning, errorLocation) {
                var message = (isError) ? "ERROR! - " : "WARN! - ";
                if (errorLocation) {
                    message += file.path + ' (line:' + (errorLocation.line + 1) + ', col:' + (errorLocation.column + 1) + ') [' + lint.id + '] ' + lint.message;
                } else {
                    message += file.path + ': ' + lint.id + ' ' + lint.message;
                }
                console.log(message);
            },
            summaryReportFn: function(file, errorCount, warningCount) {
                if (errorCount > 0 || warningCount > 0) {
                    console.log("please fix the " + errorCount + " errors and "+ warningCount + " warnings in " + file.path);
                } else {
                    console.log("No problems found in "+ file.path);
                }
            }
        }));
});

//collect debug report
gulp.task('reports', function(){
  logCapt.start(console,'build')
  reporters.output = function(messages) {
    messages && messages.forEach(function(message) {
      console.log(message.description);
    });
  }
  logCapt.stop('xml')
});

//Copy static images downloaded from 3rd party site to distribution.
//They are already mini and compressed enough!
gulp.task('copyPics', function() {
  gulp.src('src/img/index*.jpg').pipe(gulp.dest('dist/img'));
});

//optimize and minify images
gulp.task('imagemin',function(){
    return gulp.src(['src/**/*.{png,jpg}','!src/**/index*.{png,jpg}','!src/img_tmp'])
        .pipe(imagemin([
              imagemin.jpegtran({"progressive":false}),
              imagemin.optipng({"optimizationLevel": 5}),
              jpegrecompress({"accurate":true,"target":70,"strip":true,"progressive":false}),
              pngcrush({"reduce": true}),
              zopfli({"8bit":true, "more": true})]))              
        .pipe(gulp.dest('src/img_tmp'))
});

//resize, create responsive sets
gulp.task('resizeImages',['imagemin'], function() {
  return gulp.src('src/img_tmp/**/*')
    .pipe(responsive({
      'img/profilepic.jpg': {width: 70},
      'views/img/pizzeria.jpg': {
          width: 360,
          rename: 'views/img/pizzeria.jpg'
        },
      'views/img/pizza.png': {
          rename: 'views/img/pizza.png'
        },
      'img/2048.png': [{
          width: 480,
          rename: 'img/2048@2x.png'
        },{
          width: 360,
          rename: 'img/2048.png'
        }],
      'img/cam_be_like.jpg': [{
          width: 480,
          rename: 'img/cam_be_like@2x.jpg'
        },{
          width: 360,
          rename: 'img/cam_be_like.jpg'
        }],
      'img/mobilewebdev.jpg': [{
          width: 480,
          rename: 'img/mobilewebdev@2x.jpg'
        },{
          width: 360,
          rename: 'img/mobilewebdev.jpg'
        }],
       },{
          progressive: true,
          quality: 70,
          withMetadata: false,
          withoutEnlargement: false,

      }))
      .pipe(gulp.dest('dist'))
});


//optimize and minify HTML
gulp.task('minHTML', function() {
  return gulp.src('src/**/*.html')
    .pipe(replace('src/js/*.js','.min.js'))
    .pipe(replace('src/css/*.css','.min.css'))
    .pipe(googlecdn(require('./bower.json')))
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(htmlmin({removeComments: true}))
    .pipe(htmlmin({HTML5: true}))
    .pipe(gulp.dest('dist'));
});


//optimize and minify CSS
gulp.task('minCSS', function () {
    return gulp.src('src/css/*.css')
        .pipe(csso({
            restructure: true,
            sourceMap: true,
            debug: true,
            comments: false
        }))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('dist'));
});

//optimize and minify JS
gulp.task('minJS', function () {
    gulp.src('src/js/*.js')
      .pipe(jsmin())
      .pipe(rename({suffix: '.min'}))
      .pipe(gulp.dest('dist'));
});

//copy markdown help file
gulp.task('copyMD', function() {
  gulp.src('src/*.md').pipe(gulp.dest('dist'));
});

//delete dist folder in preparation for next build.
gulp.task('wipe_dist', function() {
  return del.sync('dist/**/*');
});

gulp.task('wipe_dist_noPics', function(){
    return del.sync('dist/**/*','!dist/**/*.{png,jpg}');
});

//clear caches - not needed yet.
gulp.task('wipe_img_temp', function () {
  return del.sync('src/img_tmp/**/*');
});

gulp.task('resetBuild',['wipe_dist','wipe_img_temp']);

gulp.task('lintSource',['html_check','css_check','js_check','reports']);

gulp.task('imgProcess',['copyPics','resizeImages']);

gulp.task('buildScriptsOnly',['minHTML','minCSS','minJS','copyMD']);

gulp.task('makeBuild',['imgProcess','minHTML','minCSS','minJS','copyMD']);

gulp.task('makeBuildNoPics',['minHTML','minCSS','minJS','copyMD']);

gulp.task('critical',['makeBuild'],function(cb){
  critical.generate({
        inline: true,
        base: 'dist/',
        src: 'index.html',
        dest: 'dist/index-critical.html',
        minify: true,
        width: 320,
        height: 480
    });
});

gulp.task('criticalNoPics',['makeBuildNoPics'],function(cb){
  critical.generate({
        inline: true,
        base: 'dist/',
        src: 'index.html',
        dest: 'dist/index-critical.html',
        minify: true,
        width: 320,
        height: 480
    });
});

gulp.task('backupIndex',function(){
    gulp.src("./dist/index.html")
    .pipe(rename('index.bak'))
    .pipe(gulp.dest("./dist")); 
});

gulp.task('renameIndexCritical',function(){
     gulp.src("./dist/index-critical.html")
    .pipe(rename('index.html'))
    .pipe(gulp.dest("./dist")); 
});

gulp.task('replaceIndex',function(){
    return runSequence('backupIndex','renameIndexCritical');
});

gulp.task('buildIt', function() {
    return runSequence(['wipe_img_temp','wipe_dist'],'critical','replaceIndex');
});

gulp.task('buildItNoPics', function(cb) {
    runSequence(['wipe_img_temp','wipe_dist_noPics'],'criticalNoPics');
});

gulp.task('default', function() {
  return gutil.log('The available task group options are: resetBuild, lintSource, imgProcess, makeBuild or critical (makebuild with critical path inline-CSS.)');
});