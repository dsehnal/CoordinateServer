var gulp = require('gulp'),
    plugins = {
        ts: require('gulp-typescript'),
        clean: require('gulp-clean'),        
        tsc: require('typescript')
    };

function Build() {
    var project = plugins.ts.createProject('./tsconfig.json', { typescript: plugins.tsc });
    var b = project.src().pipe(project());    
    return b.js.pipe(gulp.dest('./build'));
}

gulp.task('Clean', [], function() {
    return gulp.src(['./build/**/*.*']).pipe(plugins.clean());
});

gulp.task('default', ['Clean'], Build);